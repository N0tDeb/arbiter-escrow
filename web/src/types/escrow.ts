export type EscrowState = 0 | 1 | 2 | 3 | 4 | 5;

export type UserRole = "buyer" | "seller" | "arbitrator" | "spectator";

export interface EscrowEvent {
  id: string;
  type:
    | "Deposited"
    | "StateChanged"
    | "DisputeRaised"
    | "DeadlineExtended"
    | "ReleaseVoted"
    | "RefundVoted"
    | "FundsQueued"
    | "Withdrawn"
    | "Cancelled"
    | "ExtensionProposed"
    | "ExtensionCancelled";
  timestamp: number;
  data: Record<string, unknown>;
  blockNumber: bigint;
  logIndex: number;
}

export interface VoteStatus {
  buyerRelease: boolean;
  sellerRelease: boolean;
  arbitratorRelease: boolean;
  buyerRefund: boolean;
  arbitratorRefund: boolean;
}
