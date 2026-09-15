const ERROR_MESSAGES: Record<string, string> = {
  NotAuthorized: "You don't have permission to perform this action.",
  InvalidState: "This action is not available in the current contract state.",
  AlreadyVoted: "You have already cast your vote.",
  CrossVoteNotAllowed:
    "You cannot vote for both release and refund in the same dispute.",
  ZeroAddress: "A valid address is required — zero address is not allowed.",
  SameAddress: "Buyer, seller, and arbitrator must all be different addresses.",
  ZeroValue: "The value must be greater than zero.",
  DeadlinePassed: "The deadline for this action has already passed.",
  DeadlineNotPassed:
    "The deadline has not yet passed. Please wait until it expires.",
  NothingToWithdraw: "You have no pending funds to withdraw.",
  TransferFailed: "The ETH transfer failed. Please try again.",
  DeadlineOverflow: "The proposed deadline exceeds the maximum allowed value.",
  NoProposalPending: "There is no extension proposal to accept or cancel.",
  ProposerCannotAccept:
    "You cannot accept your own extension proposal. The other party must accept it.",
  ProposalAlreadyPending:
    "An extension proposal is already pending. Cancel it before creating a new one.",
  DirectTransferNotAllowed:
    "Send escrow funds through the Deposit action instead of a direct ETH transfer.",
  ReentrantCall: "A recursive withdrawal attempt was blocked.",
};

export function parseContractError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const err = error as {
    shortMessage?: string;
    message?: string;
    cause?: { data?: { errorName?: string }; message?: string };
  };

  // Check for custom Solidity error name in the cause
  if (err.cause?.data?.errorName) {
    const mapped = ERROR_MESSAGES[err.cause.data.errorName];
    if (mapped) return mapped;
  }

  // Try to match error name from the message
  const message = err.shortMessage || err.cause?.message || err.message || "";
  for (const [errorName, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(errorName)) {
      return friendlyMessage;
    }
  }

  // User rejected transaction
  if (
    message.includes("User rejected") ||
    message.includes("user rejected") ||
    message.includes("User denied")
  ) {
    return "Transaction was rejected in your wallet.";
  }

  // Insufficient funds
  if (
    message.includes("insufficient funds") ||
    message.includes("Insufficient funds")
  ) {
    return "Insufficient ETH balance to complete this transaction.";
  }

  // Fallback
  if (err.shortMessage) return err.shortMessage;

  return "An unexpected error occurred. Please try again.";
}
