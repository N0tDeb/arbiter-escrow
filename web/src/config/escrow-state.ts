import type { EscrowState } from "@/types/escrow";

export const ESCROW_STATE_LABELS: Record<EscrowState, string> = {
  0: "Awaiting Payment",
  1: "Awaiting Delivery",
  2: "Complete",
  3: "Refunded",
  4: "Disputed",
  5: "Cancelled",
};

export const ESCROW_STATE_COLORS: Record<EscrowState, string> = {
  0: "text-amber-700 bg-amber-50 border-amber-200",
  1: "text-blue-700 bg-blue-50 border-blue-200",
  2: "text-emerald-700 bg-emerald-50 border-emerald-200",
  3: "text-violet-700 bg-violet-50 border-violet-200",
  4: "text-red-700 bg-red-50 border-red-200",
  5: "text-slate-600 bg-slate-50 border-slate-200",
};

export const ESCROW_STATE_DOT_COLORS: Record<EscrowState, string> = {
  0: "bg-amber-500",
  1: "bg-blue-500",
  2: "bg-emerald-500",
  3: "bg-violet-500",
  4: "bg-red-500",
  5: "bg-slate-400",
};
