"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExtensionProposal } from "./extension-proposal";
import { RaiseDisputeDialog } from "./raise-dispute-dialog";
import { VotingDashboard } from "./voting-dashboard";
import { useParticipantRole } from "@/hooks/use-participant-role";
import { useDeadlineCountdown } from "@/hooks/use-deadline-countdown";
import { useApproveRelease, useClaimTimeout } from "@/hooks/use-escrow-actions";
import { formatUnixTimestamp } from "@/lib/time";
import type { VoteStatus } from "@/types/escrow";

interface AwaitingDeliveryPanelProps {
  deadline?: bigint;
  votes: VoteStatus;
}

type Countdown = ReturnType<typeof useDeadlineCountdown>;

function CountdownTimer({ countdown }: { countdown: Countdown }) {
  const { expired, days, hours, minutes, seconds } = countdown;
  const isUrgent = !expired && days === 0n && hours < 1n;

  return (
    <div className="space-y-3">
      {expired ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold text-red-700">Deadline Expired</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The seller can now claim the escrow timeout.
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-4 gap-2 ${isUrgent ? "animate-pulse" : ""}`}>
          {[
            { value: days, label: "Days" },
            { value: hours, label: "Hours" },
            { value: minutes, label: "Min" },
            { value: seconds, label: "Sec" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className={`rounded-lg border p-2.5 text-center ${
                isUrgent
                  ? "border-red-200 bg-red-50"
                  : "border-blue-100 bg-blue-50"
              }`}
            >
              <p
                className={`font-mono text-xl font-bold ${
                  isUrgent ? "text-red-600" : "text-blue-700"
                }`}
              >
                {value.toString().padStart(2, "0")}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AwaitingDeliveryPanel({ deadline, votes }: AwaitingDeliveryPanelProps) {
  const { isBuyer, isSeller, isArbitrator } = useParticipantRole();
  const { approveRelease, isProcessing: releaseProcessing } = useApproveRelease();
  const { claimTimeout, isProcessing: claimProcessing } = useClaimTimeout();
  const countdown = useDeadlineCountdown(deadline);
  const deadlineExpired = deadline !== undefined && countdown.expired;
  const actionProcessing = releaseProcessing || claimProcessing;
  const currentUserHasReleaseVote = isBuyer
    ? votes.buyerRelease
    : isSeller
      ? votes.sellerRelease
      : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-4"
    >
      <Card className="border-blue-200 bg-blue-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 border border-blue-200">
              <Timer className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Escrow Deadline
              </CardTitle>
              <p className="text-xs text-slate-500">
                Time remaining before seller timeout becomes available
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {deadline !== undefined ? (
            <CountdownTimer countdown={countdown} />
          ) : (
            <p className="text-sm text-slate-400">Loading deadline...</p>
          )}
          {deadline !== undefined && (
            <p className="mt-3 text-[10px] text-slate-400 font-mono">
              Deadline: {formatUnixTimestamp(deadline)}
            </p>
          )}
        </CardContent>
      </Card>

      <VotingDashboard
        buyerRelease={votes.buyerRelease}
        sellerRelease={votes.sellerRelease}
        arbitratorRelease={votes.arbitratorRelease}
        buyerRefund={votes.buyerRefund}
        arbitratorRefund={votes.arbitratorRefund}
        isDisputed={false}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {(isBuyer || isSeller) && (
            <Button
              size="sm"
              onClick={() => approveRelease()}
              disabled={actionProcessing || currentUserHasReleaseVote}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {releaseProcessing
                ? "Processing..."
                : currentUserHasReleaseVote
                  ? "Release Approved"
                  : "Approve Release"}
            </Button>
          )}

          {isBuyer && !deadlineExpired && (
            <RaiseDisputeDialog disabled={actionProcessing} />
          )}

          {isSeller && deadlineExpired && (
            <Button
              size="sm"
              onClick={() => claimTimeout()}
              disabled={actionProcessing}
              className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            >
              <Clock className="h-3.5 w-3.5" />
              {claimProcessing ? "Claiming..." : "Claim Timeout"}
            </Button>
          )}

          {isArbitrator && (
            <p className="flex items-center px-2 text-xs text-slate-400">
              You can act once a dispute is raised.
            </p>
          )}
        </CardContent>
      </Card>

      <ExtensionProposal isExpired={deadlineExpired} />
    </motion.div>
  );
}
