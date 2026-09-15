"use client";

import { Badge } from "@/components/ui/badge";
import { ESCROW_STATE_LABELS, ESCROW_STATE_COLORS, ESCROW_STATE_DOT_COLORS } from "@/config/escrow-state";
import type { EscrowState } from "@/types/escrow";

export function StateBadge({ state }: { state: EscrowState }) {
  return (
    <Badge
      variant="outline"
      className={`${ESCROW_STATE_COLORS[state]} gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ESCROW_STATE_DOT_COLORS[state]} animate-pulse`}
      />
      {ESCROW_STATE_LABELS[state]}
    </Badge>
  );
}
