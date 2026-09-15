"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VotingDashboard } from "./voting-dashboard";
import { useParticipantRole } from "@/hooks/use-participant-role";
import { useDeadlineCountdown } from "@/hooks/use-deadline-countdown";
import {
  useApproveRefund,
  useApproveRelease,
  useClaimArbitrationTimeout,
} from "@/hooks/use-escrow-actions";
import { useLatestDisputeReason } from "@/hooks/use-escrow-events";
import type { VoteStatus } from "@/types/escrow";

interface DisputePanelProps {
  deadline?: bigint;
  votes: VoteStatus;
}

export function DisputePanel({ deadline, votes }: DisputePanelProps) {
  const { isBuyer, isSeller, isArbitrator } = useParticipantRole();
  const { approveRelease, isProcessing: releaseProcessing } = useApproveRelease();
  const { approveRefund, isProcessing: refundProcessing } = useApproveRefund();
  const { claimArbitrationTimeout, isProcessing: claimProcessing } =
    useClaimArbitrationTimeout();
  const {
    reason: disputeReason,
    isLoading: disputeReasonLoading,
    error: disputeReasonError,
  } = useLatestDisputeReason();
  const countdown = useDeadlineCountdown(deadline);
  const deadlineExpired = deadline !== undefined && countdown.expired;
  const actionProcessing = releaseProcessing || refundProcessing || claimProcessing;

  const currentUserReleaseVote = isBuyer
    ? votes.buyerRelease
    : isSeller
      ? votes.sellerRelease
      : isArbitrator
        ? votes.arbitratorRelease
        : false;
  const currentUserRefundVote = isBuyer
    ? votes.buyerRefund
    : isArbitrator
      ? votes.arbitratorRefund
      : false;

  const timeLeft = deadlineExpired
    ? "Expired"
    : `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-4"
    >
      <Card className="border-red-200 bg-red-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-red-400 via-orange-400 to-red-400" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-red-700">
                  Dispute Active
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Arbitration period in progress
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Arbitration
              </p>
              <p
                className={`font-mono text-sm font-bold ${
                  deadlineExpired ? "text-red-600" : "text-slate-800"
                }`}
              >
                {deadline === undefined ? "Loading..." : timeLeft}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="rounded-lg border border-red-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Dispute Reason
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  {disputeReasonLoading
                    ? "Loading dispute reason..."
                    : disputeReasonError
                      ? "The dispute reason could not be read from contract events."
                      : disputeReason
                        ? `“${disputeReason}”`
                        : "No dispute reason event was found."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <VotingDashboard
        buyerRelease={votes.buyerRelease}
        sellerRelease={votes.sellerRelease}
        arbitratorRelease={votes.arbitratorRelease}
        buyerRefund={votes.buyerRefund}
        arbitratorRefund={votes.arbitratorRefund}
        isDisputed
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {!deadlineExpired && (isBuyer || isSeller || isArbitrator) && (
            <Button
              size="sm"
              onClick={() => approveRelease()}
              disabled={
                actionProcessing || currentUserReleaseVote || currentUserRefundVote
              }
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {releaseProcessing
                ? "Processing..."
                : currentUserReleaseVote
                  ? "Release Vote Cast"
                  : currentUserRefundVote
                    ? "Refund Vote Cast"
                    : "Vote Release"}
            </Button>
          )}

          {!deadlineExpired && (isBuyer || isArbitrator) && (
            <Button
              size="sm"
              onClick={() => approveRefund()}
              disabled={
                actionProcessing || currentUserRefundVote || currentUserReleaseVote
              }
              className="bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {refundProcessing
                ? "Processing..."
                : currentUserRefundVote
                  ? "Refund Vote Cast"
                  : currentUserReleaseVote
                    ? "Release Vote Cast"
                    : "Vote Refund"}
            </Button>
          )}

          {deadlineExpired && (
            <p className="flex items-center px-2 text-xs text-slate-500">
              Arbitration voting is closed. Buyer or seller may trigger the timeout refund.
            </p>
          )}

          {deadlineExpired && (isBuyer || isSeller) && (
            <Button
              size="sm"
              onClick={() => claimArbitrationTimeout()}
              disabled={actionProcessing}
              className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            >
              <Clock className="h-3.5 w-3.5" />
              {claimProcessing ? "Claiming..." : "Claim Timeout"}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
