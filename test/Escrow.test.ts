import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Escrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const ONE_DAY = 86400n;
const SEVEN_DAYS = 604800n;
const ONE_ETH = ethers.parseEther("1.0");
const UINT64_MAX = (1n << 64n) - 1n;

describe("Escrow", function () {
  let escrow: Escrow;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let arbitrator: SignerWithAddress;
  let stranger: SignerWithAddress;

  async function deploy(duration = ONE_DAY) {
    const [b, s, a, st] = await ethers.getSigners();
    buyer = b;
    seller = s;
    arbitrator = a;
    stranger = st;

    const Factory = await ethers.getContractFactory("Escrow", buyer);
    escrow = (await Factory.deploy(
      seller.address,
      arbitrator.address,
      duration
    )) as Escrow;
    await escrow.waitForDeployment();
  }

  async function depositAndAwait() {
    await escrow.connect(buyer).deposit({ value: ONE_ETH });
  }

  async function movePastDeadline() {
    const deadline = await escrow.deadline();
    await time.setNextBlockTimestamp(Number(deadline) + 1);
  }

  describe("Deployment", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("stores buyer, seller, and arbitrator correctly", async () => {
      expect(await escrow.buyer()).to.equal(buyer.address);
      expect(await escrow.seller()).to.equal(seller.address);
      expect(await escrow.arbitrator()).to.equal(arbitrator.address);
    });

    it("stores the configured delivery duration", async () => {
      expect(await escrow.deliveryDuration()).to.equal(ONE_DAY);
    });

    it("starts in AWAITING_PAYMENT with no active deadline", async () => {
      expect(await escrow.currentState()).to.equal(0);
      expect(await escrow.deadline()).to.equal(0);
    });

    it("reverts with ZeroAddress if seller is zero", async () => {
      const [b, , a] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(ethers.ZeroAddress, a.address, ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("reverts with ZeroAddress if arbitrator is zero", async () => {
      const [b, s] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(s.address, ethers.ZeroAddress, ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("reverts if duration is zero", async () => {
      const [b, s, a] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(s.address, a.address, 0n))
        .to.be.revertedWithCustomError(escrow, "ZeroValue");
    });

    it("reverts if duration cannot fit into uint64", async () => {
      const [b, s, a] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(s.address, a.address, UINT64_MAX + 1n))
        .to.be.revertedWithCustomError(escrow, "DeadlineOverflow");
    });

    it("reverts if buyer equals seller", async () => {
      const [b, , a] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(b.address, a.address, ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "SameAddress");
    });

    it("reverts if buyer equals arbitrator", async () => {
      const [b, s] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(s.address, b.address, ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "SameAddress");
    });

    it("reverts if seller equals arbitrator", async () => {
      const [b, s] = await ethers.getSigners();
      const Factory = await ethers.getContractFactory("Escrow", b);
      await expect(Factory.deploy(s.address, s.address, ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "SameAddress");
    });
  });

  describe("deposit()", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("transitions to AWAITING_DELIVERY", async () => {
      await depositAndAwait();
      expect(await escrow.currentState()).to.equal(1);
    });

    it("records the deposited amount", async () => {
      await depositAndAwait();
      expect(await escrow.amount()).to.equal(ONE_ETH);
    });

    it("starts the delivery deadline from the deposit block timestamp", async () => {
      const tx = await escrow.connect(buyer).deposit({ value: ONE_ETH });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      expect(await escrow.deadline()).to.equal(BigInt(block!.timestamp) + ONE_DAY);
    });

    it("can be funded long after deployment because the delivery period starts on deposit", async () => {
      await time.increase(Number(ONE_DAY * 3n));
      await expect(escrow.connect(buyer).deposit({ value: ONE_ETH }))
        .to.emit(escrow, "Deposited")
        .withArgs(buyer.address, ONE_ETH);
      expect(await escrow.currentState()).to.equal(1);
    });

    it("emits Deposited and StateChanged events", async () => {
      await expect(escrow.connect(buyer).deposit({ value: ONE_ETH }))
        .to.emit(escrow, "Deposited").withArgs(buyer.address, ONE_ETH)
        .and.to.emit(escrow, "StateChanged").withArgs(0, 1);
    });

    it("reverts if caller is not buyer", async () => {
      await expect(escrow.connect(seller).deposit({ value: ONE_ETH }))
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("reverts if value is zero", async () => {
      await expect(escrow.connect(buyer).deposit({ value: 0n }))
        .to.be.revertedWithCustomError(escrow, "ZeroValue");
    });

    it("reverts if called again", async () => {
      await depositAndAwait();
      await expect(escrow.connect(buyer).deposit({ value: ONE_ETH }))
        .to.be.revertedWithCustomError(escrow, "InvalidState");
    });
  });

  describe("cancelBeforeDeposit()", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("lets the buyer cancel before deposit", async () => {
      await escrow.connect(buyer).cancelBeforeDeposit();
      expect(await escrow.currentState()).to.equal(5);
    });

    it("lets the seller cancel before deposit", async () => {
      await escrow.connect(seller).cancelBeforeDeposit();
      expect(await escrow.currentState()).to.equal(5);
    });

    it("reverts for a stranger", async () => {
      await expect(escrow.connect(stranger).cancelBeforeDeposit())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("reverts after deposit", async () => {
      await depositAndAwait();
      await expect(escrow.connect(buyer).cancelBeforeDeposit())
        .to.be.revertedWithCustomError(escrow, "InvalidState");
    });
  });

  describe("approveRelease() — normal settlement", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
    });

    it("queues funds and completes after buyer + seller approve", async () => {
      await escrow.connect(buyer).approveRelease();
      await expect(escrow.connect(seller).approveRelease())
        .to.emit(escrow, "FundsQueued").withArgs(seller.address, ONE_ETH)
        .and.to.emit(escrow, "StateChanged").withArgs(1, 2);

      expect(await escrow.currentState()).to.equal(2);
      expect(await escrow.amount()).to.equal(0);
      expect(await escrow.pendingWithdrawals(seller.address)).to.equal(ONE_ETH);
    });

    it("does not release after only one vote", async () => {
      await escrow.connect(buyer).approveRelease();
      expect(await escrow.currentState()).to.equal(1);
    });

    it("reverts AlreadyVoted on a duplicate vote", async () => {
      await escrow.connect(buyer).approveRelease();
      await expect(escrow.connect(buyer).approveRelease())
        .to.be.revertedWithCustomError(escrow, "AlreadyVoted");
    });

    it("reverts CrossVoteNotAllowed after the same participant voted refund", async () => {
      await escrow.connect(buyer).raiseDispute("test");
      await escrow.connect(buyer).approveRefund();
      await expect(escrow.connect(buyer).approveRelease())
        .to.be.revertedWithCustomError(escrow, "CrossVoteNotAllowed");
    });

    it("does not let the arbitrator vote before a dispute", async () => {
      await expect(escrow.connect(arbitrator).approveRelease())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("does not let a stranger vote", async () => {
      await expect(escrow.connect(stranger).approveRelease())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("still permits consensual buyer + seller release after the delivery deadline", async () => {
      await movePastDeadline();
      await escrow.connect(buyer).approveRelease();
      await escrow.connect(seller).approveRelease();
      expect(await escrow.currentState()).to.equal(2);
    });
  });

  describe("claimTimeout()", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
    });

    it("lets the seller claim after the delivery deadline", async () => {
      await movePastDeadline();
      await escrow.connect(seller).claimTimeout();
      expect(await escrow.currentState()).to.equal(2);
      expect(await escrow.pendingWithdrawals(seller.address)).to.equal(ONE_ETH);
    });

    it("reverts before the deadline", async () => {
      await expect(escrow.connect(seller).claimTimeout())
        .to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
    });

    it("reverts exactly at the deadline", async () => {
      const deadline = await escrow.deadline();
      await time.setNextBlockTimestamp(Number(deadline));
      await expect(escrow.connect(seller).claimTimeout())
        .to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
    });

    it("does not let the buyer claim seller timeout", async () => {
      await movePastDeadline();
      await expect(escrow.connect(buyer).claimTimeout())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });
  });

  describe("raiseDispute()", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
    });

    it("moves the escrow to DISPUTED", async () => {
      await expect(escrow.connect(buyer).raiseDispute("Item not received"))
        .to.emit(escrow, "DisputeRaised").withArgs(buyer.address, "Item not received")
        .and.to.emit(escrow, "StateChanged").withArgs(1, 4);
      expect(await escrow.currentState()).to.equal(4);
    });

    it("sets a fresh seven-day arbitration deadline", async () => {
      const tx = await escrow.connect(buyer).raiseDispute("Test");
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      expect(await escrow.deadline()).to.equal(BigInt(block!.timestamp) + SEVEN_DAYS);
    });

    it("clears release votes when the dispute begins", async () => {
      await escrow.connect(buyer).approveRelease();
      await escrow.connect(buyer).raiseDispute("Test");
      const [buyerRelease, sellerRelease, arbitratorRelease] = await escrow.getVoteStatus();
      expect(buyerRelease || sellerRelease || arbitratorRelease).to.be.false;
    });

    it("does not let the seller raise a dispute", async () => {
      await expect(escrow.connect(seller).raiseDispute("Fake"))
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("allows a dispute exactly at the delivery deadline", async () => {
      const deadline = await escrow.deadline();
      await time.setNextBlockTimestamp(Number(deadline));
      await escrow.connect(buyer).raiseDispute("Last moment");
      expect(await escrow.currentState()).to.equal(4);
    });

    it("reverts after the delivery deadline", async () => {
      await movePastDeadline();
      await expect(escrow.connect(buyer).raiseDispute("Late"))
        .to.be.revertedWithCustomError(escrow, "DeadlinePassed");
    });
  });

  describe("approveRelease() — disputed settlement", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
      await escrow.connect(buyer).raiseDispute("Dispute!");
    });

    it("completes with arbitrator + seller release votes", async () => {
      await escrow.connect(seller).approveRelease();
      await expect(escrow.connect(arbitrator).approveRelease())
        .to.emit(escrow, "FundsQueued").withArgs(seller.address, ONE_ETH);
      expect(await escrow.currentState()).to.equal(2);
    });

    it("completes with arbitrator + buyer release votes", async () => {
      await escrow.connect(buyer).approveRelease();
      await escrow.connect(arbitrator).approveRelease();
      expect(await escrow.currentState()).to.equal(2);
    });

    it("does not complete with only the arbitrator vote", async () => {
      await escrow.connect(arbitrator).approveRelease();
      expect(await escrow.currentState()).to.equal(4);
    });

    it("allows disputed voting exactly at the arbitration deadline", async () => {
      const deadline = await escrow.deadline();
      await escrow.connect(buyer).approveRelease();
      await time.setNextBlockTimestamp(Number(deadline));
      await escrow.connect(arbitrator).approveRelease();
      expect(await escrow.currentState()).to.equal(2);
    });

    it("rejects release votes after the arbitration deadline", async () => {
      await movePastDeadline();
      await expect(escrow.connect(arbitrator).approveRelease())
        .to.be.revertedWithCustomError(escrow, "DeadlinePassed");
    });
  });

  describe("approveRefund()", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
      await escrow.connect(buyer).raiseDispute("Dispute!");
    });

    it("refunds with arbitrator + buyer votes", async () => {
      await escrow.connect(buyer).approveRefund();
      await expect(escrow.connect(arbitrator).approveRefund())
        .to.emit(escrow, "FundsQueued").withArgs(buyer.address, ONE_ETH)
        .and.to.emit(escrow, "StateChanged").withArgs(4, 3);
      expect(await escrow.currentState()).to.equal(3);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(ONE_ETH);
    });

    it("does not let the seller vote for a refund", async () => {
      await expect(escrow.connect(seller).approveRefund())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("reverts AlreadyVoted on a duplicate refund vote", async () => {
      await escrow.connect(buyer).approveRefund();
      await expect(escrow.connect(buyer).approveRefund())
        .to.be.revertedWithCustomError(escrow, "AlreadyVoted");
    });

    it("rejects refund votes after the arbitration deadline", async () => {
      await movePastDeadline();
      await expect(escrow.connect(buyer).approveRefund())
        .to.be.revertedWithCustomError(escrow, "DeadlinePassed");
    });
  });

  describe("claimArbitrationTimeout()", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
      await escrow.connect(buyer).raiseDispute("Dispute!");
    });

    it("lets the buyer trigger an expired arbitration refund", async () => {
      await movePastDeadline();
      await escrow.connect(buyer).claimArbitrationTimeout();
      expect(await escrow.currentState()).to.equal(3);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(ONE_ETH);
    });

    it("lets the seller trigger the same buyer refund", async () => {
      await movePastDeadline();
      await escrow.connect(seller).claimArbitrationTimeout();
      expect(await escrow.currentState()).to.equal(3);
      expect(await escrow.pendingWithdrawals(buyer.address)).to.equal(ONE_ETH);
    });

    it("reverts before arbitration expires", async () => {
      await expect(escrow.connect(buyer).claimArbitrationTimeout())
        .to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
    });

    it("reverts exactly at the arbitration deadline", async () => {
      const deadline = await escrow.deadline();
      await time.setNextBlockTimestamp(Number(deadline));
      await expect(escrow.connect(buyer).claimArbitrationTimeout())
        .to.be.revertedWithCustomError(escrow, "DeadlineNotPassed");
    });

    it("does not let the arbitrator trigger the timeout", async () => {
      await movePastDeadline();
      await expect(escrow.connect(arbitrator).claimArbitrationTimeout())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });
  });

  describe("deadline extensions", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
    });

    it("extends the deadline after buyer proposes and seller accepts", async () => {
      const before = await escrow.deadline();
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await escrow.connect(seller).acceptExtension();
      expect((await escrow.deadline()) - before).to.equal(ONE_DAY);
    });

    it("allows seller to propose and buyer to accept", async () => {
      await escrow.connect(seller).proposeExtension(ONE_DAY);
      await escrow.connect(buyer).acceptExtension();
      expect(await escrow.extensionProposer()).to.equal(ethers.ZeroAddress);
    });

    it("does not let the proposer accept their own proposal", async () => {
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await expect(escrow.connect(buyer).acceptExtension())
        .to.be.revertedWithCustomError(escrow, "ProposerCannotAccept");
    });

    it("rejects another proposal while one is pending", async () => {
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await expect(escrow.connect(seller).proposeExtension(ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "ProposalAlreadyPending");
    });

    it("lets the proposer cancel their own proposal", async () => {
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await escrow.connect(buyer).cancelExtensionProposal();
      expect(await escrow.extensionProposer()).to.equal(ethers.ZeroAddress);
    });

    it("does not let the non-proposer cancel", async () => {
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await expect(escrow.connect(seller).cancelExtensionProposal())
        .to.be.revertedWithCustomError(escrow, "NotAuthorized");
    });

    it("reverts NoProposalPending when there is nothing to cancel", async () => {
      await expect(escrow.connect(buyer).cancelExtensionProposal())
        .to.be.revertedWithCustomError(escrow, "NoProposalPending");
    });

    it("reverts DeadlineOverflow for an addition too large for uint64 without panicking", async () => {
      await expect(escrow.connect(buyer).proposeExtension(ethers.MaxUint256))
        .to.be.revertedWithCustomError(escrow, "DeadlineOverflow");
    });

    it("rejects new extension proposals after the delivery deadline", async () => {
      await movePastDeadline();
      await expect(escrow.connect(buyer).proposeExtension(ONE_DAY))
        .to.be.revertedWithCustomError(escrow, "DeadlinePassed");
    });

    it("rejects acceptance if the original deadline expired after proposal", async () => {
      await escrow.connect(buyer).proposeExtension(ONE_DAY);
      await movePastDeadline();
      await expect(escrow.connect(seller).acceptExtension())
        .to.be.revertedWithCustomError(escrow, "DeadlinePassed");
    });
  });

  describe("withdraw()", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
      await escrow.connect(buyer).approveRelease();
      await escrow.connect(seller).approveRelease();
    });

    it("pays the seller", async () => {
      const before = await ethers.provider.getBalance(seller.address);
      const tx = await escrow.connect(seller).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(seller.address);
      expect(after + gasCost - before).to.equal(ONE_ETH);
    });

    it("emits Withdrawn", async () => {
      await expect(escrow.connect(seller).withdraw())
        .to.emit(escrow, "Withdrawn").withArgs(seller.address, ONE_ETH);
    });

    it("clears the pending withdrawal and contract balance", async () => {
      const contractAddress = await escrow.getAddress();
      expect(await ethers.provider.getBalance(contractAddress)).to.equal(ONE_ETH);
      await escrow.connect(seller).withdraw();
      expect(await escrow.pendingWithdrawals(seller.address)).to.equal(0);
      expect(await ethers.provider.getBalance(contractAddress)).to.equal(0);
    });

    it("conserves the deposited funds across escrow, queued payout, and withdrawal", async () => {
      const contractAddress = await escrow.getAddress();
      const queuedBefore = await escrow.pendingWithdrawals(seller.address);
      const escrowBalanceBefore = await ethers.provider.getBalance(contractAddress);

      expect(await escrow.amount()).to.equal(0);
      expect(queuedBefore).to.equal(ONE_ETH);
      expect(escrowBalanceBefore).to.equal(ONE_ETH);

      await escrow.connect(seller).withdraw();

      const queuedAfter = await escrow.pendingWithdrawals(seller.address);
      const escrowBalanceAfter = await ethers.provider.getBalance(contractAddress);
      expect(queuedAfter).to.equal(0);
      expect(escrowBalanceAfter).to.equal(0);
    });

    it("reverts NothingToWithdraw on a second withdrawal", async () => {
      await escrow.connect(seller).withdraw();
      await expect(escrow.connect(seller).withdraw())
        .to.be.revertedWithCustomError(escrow, "NothingToWithdraw");
    });

    it("does not give the buyer a seller payout", async () => {
      await expect(escrow.connect(buyer).withdraw())
        .to.be.revertedWithCustomError(escrow, "NothingToWithdraw");
    });
  });

  describe("withdrawal security", () => {
    it("preserves the queued payout if the recipient rejects ETH", async () => {
      const [b, , a] = await ethers.getSigners();
      buyer = b;
      arbitrator = a;

      const Receiver = await ethers.getContractFactory("RevertingReceiver");
      const receiver = await Receiver.deploy();
      await receiver.waitForDeployment();

      const Factory = await ethers.getContractFactory("Escrow", buyer);
      const target = (await Factory.deploy(
        await receiver.getAddress(),
        arbitrator.address,
        ONE_DAY
      )) as Escrow;
      await target.waitForDeployment();
      await receiver.setEscrow(await target.getAddress());

      await target.connect(buyer).deposit({ value: ONE_ETH });
      await target.connect(buyer).approveRelease();
      await receiver.approveRelease();

      await expect(receiver.withdrawPayout())
        .to.be.revertedWithCustomError(target, "TransferFailed");

      expect(await target.pendingWithdrawals(await receiver.getAddress())).to.equal(ONE_ETH);
      expect(await ethers.provider.getBalance(await target.getAddress())).to.equal(ONE_ETH);
    });

    it("blocks a recursive withdraw attempt while still paying exactly once", async () => {
      const [b, , a] = await ethers.getSigners();
      buyer = b;
      arbitrator = a;

      const Receiver = await ethers.getContractFactory("ReentrantReceiver");
      const receiver = await Receiver.deploy();
      await receiver.waitForDeployment();

      const Factory = await ethers.getContractFactory("Escrow", buyer);
      const target = (await Factory.deploy(
        await receiver.getAddress(),
        arbitrator.address,
        ONE_DAY
      )) as Escrow;
      await target.waitForDeployment();
      await receiver.setEscrow(await target.getAddress());

      await target.connect(buyer).deposit({ value: ONE_ETH });
      await target.connect(buyer).approveRelease();
      await receiver.approveRelease();
      await receiver.withdrawPayout();

      expect(await receiver.reentrySucceeded()).to.be.false;
      expect(await receiver.receiveCount()).to.equal(1);
      expect(await target.pendingWithdrawals(await receiver.getAddress())).to.equal(0);
      expect(await ethers.provider.getBalance(await receiver.getAddress())).to.equal(ONE_ETH);
      expect(await ethers.provider.getBalance(await target.getAddress())).to.equal(0);
    });
  });

  describe("view functions", () => {
    beforeEach(async () => {
      await deploy();
      await depositAndAwait();
    });

    it("getVoteStatus returns all false initially", async () => {
      const [buyerRelease, sellerRelease, arbitratorRelease, buyerRefund, arbitratorRefund] =
        await escrow.getVoteStatus();
      expect(
        buyerRelease || sellerRelease || arbitratorRelease || buyerRefund || arbitratorRefund
      ).to.be.false;
    });

    it("getVoteStatus reflects a buyer release vote", async () => {
      await escrow.connect(buyer).approveRelease();
      const [buyerRelease] = await escrow.getVoteStatus();
      expect(buyerRelease).to.be.true;
    });

    it("isParty returns true for all three participants", async () => {
      expect(await escrow.isParty(buyer.address)).to.be.true;
      expect(await escrow.isParty(seller.address)).to.be.true;
      expect(await escrow.isParty(arbitrator.address)).to.be.true;
    });

    it("isParty returns false for a stranger", async () => {
      expect(await escrow.isParty(stranger.address)).to.be.false;
    });
  });

  describe("receive()", () => {
    beforeEach(async () => {
      await deploy();
    });

    it("rejects direct ETH transfers", async () => {
      await expect(
        buyer.sendTransaction({ to: await escrow.getAddress(), value: ONE_ETH })
      ).to.be.revertedWithCustomError(escrow, "DirectTransferNotAllowed");
    });
  });
});
