// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Minimal reentrancy guard used by Escrow.withdraw().
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    error ReentrantCall();

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/// @title Arbiter Escrow
/// @notice Single-transaction ETH escrow for a buyer, seller, and neutral arbitrator.
/// @dev The delivery period begins when the buyer funds the escrow. Final payouts use
///      a pull-payment model so settlement never transfers ETH to a recipient directly.
contract Escrow is ReentrancyGuard {
    address public immutable buyer;
    address payable public immutable seller;
    address public immutable arbitrator;

    /// @notice Delivery period configured at deployment, measured from a successful deposit.
    uint64 public immutable deliveryDuration;

    /// @notice ETH currently held for an unresolved escrow. Becomes zero when a payout is queued.
    uint256 public amount;

    mapping(address => uint256) public pendingWithdrawals;

    /// @notice Active delivery or arbitration deadline. Zero before the buyer deposits.
    uint64 public deadline;
    uint64 public constant ARBITRATION_PERIOD = 7 days;

    enum State {
        AWAITING_PAYMENT,
        AWAITING_DELIVERY,
        COMPLETE,
        REFUNDED,
        DISPUTED,
        CANCELLED
    }
    State public currentState;

    mapping(address => bool) public releaseVotes;
    mapping(address => bool) public refundVotes;

    address public extensionProposer;
    uint256 public proposedAdditionalSeconds;

    event Deposited(address indexed buyer, uint256 amount);
    event StateChanged(State indexed from, State indexed to);
    event ReleaseVoted(address indexed voter);
    event RefundVoted(address indexed voter);
    event FundsQueued(address indexed recipient, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event DisputeRaised(address indexed by, string reason);
    event DeadlineExtended(uint64 newDeadline);
    event ExtensionProposed(address indexed proposer, uint256 additionalSeconds);
    event ExtensionCancelled(address indexed by);
    event Cancelled(address indexed by);

    error NotAuthorized();
    error InvalidState(State current);
    error AlreadyVoted();
    error CrossVoteNotAllowed();
    error ZeroAddress();
    error SameAddress();
    error ZeroValue();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error NothingToWithdraw();
    error TransferFailed();
    error DeadlineOverflow();
    error NoProposalPending();
    error ProposerCannotAccept();
    error ProposalAlreadyPending();
    error DirectTransferNotAllowed();

    /// @param _seller Recipient of a successful escrow release.
    /// @param _arbitrator Neutral participant who joins settlement voting after a dispute.
    /// @param _duration Delivery period in seconds, starting when the buyer deposits.
    constructor(
        address payable _seller,
        address _arbitrator,
        uint256 _duration
    ) {
        if (_seller == address(0) || _arbitrator == address(0)) revert ZeroAddress();
        if (_duration == 0) revert ZeroValue();
        if (_duration > type(uint64).max) revert DeadlineOverflow();

        if (_seller == msg.sender) revert SameAddress();
        if (_arbitrator == msg.sender) revert SameAddress();
        if (_arbitrator == _seller) revert SameAddress();

        buyer = msg.sender;
        seller = _seller;
        arbitrator = _arbitrator;
        deliveryDuration = uint64(_duration);
        currentState = State.AWAITING_PAYMENT;
    }

    modifier onlyParty() {
        if (msg.sender != buyer && msg.sender != seller && msg.sender != arbitrator) {
            revert NotAuthorized();
        }
        _;
    }

    modifier inState(State _expected) {
        if (currentState != _expected) revert InvalidState(currentState);
        _;
    }

    /// @notice Fund the escrow and start the configured delivery period.
    function deposit() external payable inState(State.AWAITING_PAYMENT) {
        if (msg.sender != buyer) revert NotAuthorized();
        if (msg.value == 0) revert ZeroValue();

        uint256 newDeadline = block.timestamp + uint256(deliveryDuration);
        if (newDeadline > type(uint64).max) revert DeadlineOverflow();

        amount = msg.value;
        deadline = uint64(newDeadline);
        _transition(State.AWAITING_DELIVERY);
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Cancel an unfunded escrow. Buyer or seller may cancel.
    function cancelBeforeDeposit() external inState(State.AWAITING_PAYMENT) {
        if (msg.sender != buyer && msg.sender != seller) revert NotAuthorized();
        _transition(State.CANCELLED);
        emit Cancelled(msg.sender);
    }

    /// @notice Vote to release funds to the seller.
    /// @dev Before a dispute, buyer + seller are required. During a dispute, the
    ///      arbitrator plus either buyer or seller are required. Dispute voting closes
    ///      after the arbitration deadline.
    function approveRelease() external onlyParty {
        State cs = currentState;
        if (cs != State.AWAITING_DELIVERY && cs != State.DISPUTED) {
            revert InvalidState(cs);
        }

        if (msg.sender == arbitrator && cs != State.DISPUTED) revert NotAuthorized();
        if (cs == State.DISPUTED && block.timestamp > deadline) revert DeadlinePassed();
        if (refundVotes[msg.sender]) revert CrossVoteNotAllowed();
        if (releaseVotes[msg.sender]) revert AlreadyVoted();

        releaseVotes[msg.sender] = true;
        emit ReleaseVoted(msg.sender);

        bool threshold;
        if (cs == State.AWAITING_DELIVERY) {
            threshold = releaseVotes[buyer] && releaseVotes[seller];
        } else {
            threshold = releaseVotes[arbitrator] &&
                (releaseVotes[buyer] || releaseVotes[seller]);
        }

        if (threshold) {
            _queuePayout(seller, amount);
            _transition(State.COMPLETE);
        }
    }

    /// @notice Vote to refund the buyer during an active dispute.
    /// @dev Requires both buyer and arbitrator. Voting closes after the arbitration deadline.
    function approveRefund() external onlyParty inState(State.DISPUTED) {
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (msg.sender == seller) revert NotAuthorized();
        if (releaseVotes[msg.sender]) revert CrossVoteNotAllowed();
        if (refundVotes[msg.sender]) revert AlreadyVoted();

        refundVotes[msg.sender] = true;
        emit RefundVoted(msg.sender);

        if (refundVotes[arbitrator] && refundVotes[buyer]) {
            _queuePayout(buyer, amount);
            _transition(State.REFUNDED);
        }
    }

    /// @notice Raise a dispute before the delivery deadline and start a seven-day arbitration period.
    function raiseDispute(string calldata _reason)
        external
        inState(State.AWAITING_DELIVERY)
    {
        if (msg.sender != buyer) revert NotAuthorized();
        if (block.timestamp > deadline) revert DeadlinePassed();

        releaseVotes[buyer] = false;
        releaseVotes[seller] = false;
        releaseVotes[arbitrator] = false;
        refundVotes[buyer] = false;
        refundVotes[seller] = false;
        refundVotes[arbitrator] = false;

        extensionProposer = address(0);
        proposedAdditionalSeconds = 0;

        uint256 newDeadline = block.timestamp + uint256(ARBITRATION_PERIOD);
        if (newDeadline > type(uint64).max) revert DeadlineOverflow();
        deadline = uint64(newDeadline);

        _transition(State.DISPUTED);
        emit DisputeRaised(msg.sender, _reason);
    }

    /// @notice Let the seller settle an undisputed escrow after the delivery deadline.
    function claimTimeout() external inState(State.AWAITING_DELIVERY) {
        if (msg.sender != seller) revert NotAuthorized();
        if (block.timestamp <= deadline) revert DeadlineNotPassed();

        _queuePayout(seller, amount);
        _transition(State.COMPLETE);
    }

    /// @notice Resolve an expired dispute by refunding the buyer.
    /// @dev Buyer or seller may trigger the timeout; the payout always goes to the buyer.
    function claimArbitrationTimeout() external inState(State.DISPUTED) {
        if (msg.sender != buyer && msg.sender != seller) revert NotAuthorized();
        if (block.timestamp <= deadline) revert DeadlineNotPassed();

        _queuePayout(buyer, amount);
        _transition(State.REFUNDED);
    }

    /// @notice Propose extending an active delivery deadline.
    function proposeExtension(uint256 _additionalSeconds)
        external
        inState(State.AWAITING_DELIVERY)
    {
        if (msg.sender != buyer && msg.sender != seller) revert NotAuthorized();
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (_additionalSeconds == 0) revert ZeroValue();
        if (extensionProposer != address(0)) revert ProposalAlreadyPending();

        if (_additionalSeconds > type(uint64).max - uint256(deadline)) {
            revert DeadlineOverflow();
        }

        extensionProposer = msg.sender;
        proposedAdditionalSeconds = _additionalSeconds;
        emit ExtensionProposed(msg.sender, _additionalSeconds);
    }

    /// @notice Accept the other party's pending extension proposal before the current deadline expires.
    function acceptExtension() external inState(State.AWAITING_DELIVERY) {
        if (msg.sender != buyer && msg.sender != seller) revert NotAuthorized();
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (extensionProposer == address(0)) revert NoProposalPending();
        if (msg.sender == extensionProposer) revert ProposerCannotAccept();

        if (proposedAdditionalSeconds > type(uint64).max - uint256(deadline)) {
            revert DeadlineOverflow();
        }

        deadline = uint64(uint256(deadline) + proposedAdditionalSeconds);
        extensionProposer = address(0);
        proposedAdditionalSeconds = 0;
        emit DeadlineExtended(deadline);
    }

    /// @notice Cancel the caller's own pending extension proposal.
    function cancelExtensionProposal() external inState(State.AWAITING_DELIVERY) {
        if (extensionProposer == address(0)) revert NoProposalPending();
        if (msg.sender != extensionProposer) revert NotAuthorized();
        extensionProposer = address(0);
        proposedAdditionalSeconds = 0;
        emit ExtensionCancelled(msg.sender);
    }

    /// @notice Withdraw a payout previously queued by settlement.
    function withdraw() external nonReentrant {
        uint256 payout = pendingWithdrawals[msg.sender];
        if (payout == 0) revert NothingToWithdraw();

        // Effects before interaction: a failed transfer reverts this entire transaction.
        pendingWithdrawals[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, payout);
    }

    function getVoteStatus()
        external
        view
        returns (
            bool buyerRelease,
            bool sellerRelease,
            bool arbitratorRelease,
            bool buyerRefund,
            bool arbitratorRefund
        )
    {
        return (
            releaseVotes[buyer],
            releaseVotes[seller],
            releaseVotes[arbitrator],
            refundVotes[buyer],
            refundVotes[arbitrator]
        );
    }

    function isParty(address _addr) external view returns (bool) {
        return _addr == buyer || _addr == seller || _addr == arbitrator;
    }

    function _queuePayout(address recipient, uint256 _payout) internal {
        amount = 0;
        extensionProposer = address(0);
        proposedAdditionalSeconds = 0;
        pendingWithdrawals[recipient] += _payout;
        emit FundsQueued(recipient, _payout);
    }

    function _transition(State _next) internal {
        State prev = currentState;
        currentState = _next;
        emit StateChanged(prev, _next);
    }

    receive() external payable {
        revert DirectTransferNotAllowed();
    }
}
