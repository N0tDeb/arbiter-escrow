import { ethers } from "hardhat";
import { ESCROW_ADDRESS } from "../web/src/config/escrow-contract";

function assertAddress(label: string, actual: string, expected: string) {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${label} mismatch: expected ${expected}, received ${actual}`);
  }
}

async function main() {
  const [buyer, seller, arbitrator] = await ethers.getSigners();
  const code = await ethers.provider.getCode(ESCROW_ADDRESS);

  if (code === "0x") {
    throw new Error(
      `No contract is deployed at ${ESCROW_ADDRESS}. Start the Hardhat node and run npm run deploy first.`
    );
  }

  const escrow = await ethers.getContractAt("Escrow", ESCROW_ADDRESS);
  const [contractBuyer, contractSeller, contractArbitrator, state, deadline] =
    await Promise.all([
      escrow.buyer(),
      escrow.seller(),
      escrow.arbitrator(),
      escrow.currentState(),
      escrow.deadline(),
    ]);

  assertAddress("Buyer", contractBuyer, buyer.address);
  assertAddress("Seller", contractSeller, seller.address);
  assertAddress("Arbitrator", contractArbitrator, arbitrator.address);

  console.log("Local Arbiter deployment verified.");
  console.log(`Contract:   ${ESCROW_ADDRESS}`);
  console.log(`Buyer:      ${contractBuyer}`);
  console.log(`Seller:     ${contractSeller}`);
  console.log(`Arbitrator: ${contractArbitrator}`);
  console.log(`State:      ${state.toString()}`);
  console.log(`Deadline:   ${deadline.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
