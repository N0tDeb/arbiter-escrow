"use client";

import { motion } from "framer-motion";
import { Check, Scale, Store, User, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VotingDashboardProps {
  buyerRelease: boolean;
  sellerRelease: boolean;
  arbitratorRelease: boolean;
  buyerRefund: boolean;
  arbitratorRefund: boolean;
  isDisputed: boolean;
}

function VoteIndicator({
  voted,
  label,
  icon: Icon,
  activeClass,
  delay,
}: {
  voted: boolean;
  label: string;
  icon: React.ElementType;
  activeClass: { bg: string; icon: string; text: string; check: string };
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
        voted
          ? `${activeClass.bg} border-current`
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-md ${
          voted ? activeClass.bg : "bg-white border border-slate-200"
        }`}
      >
        <Icon
          className={`h-3.5 w-3.5 ${
            voted ? activeClass.icon : "text-slate-300"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-medium truncate ${
            voted ? activeClass.text : "text-slate-500"
          }`}
        >
          {label}
        </p>
      </div>
      {voted ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, delay: delay + 0.1 }}
        >
          <Check className={`h-4 w-4 ${activeClass.check}`} />
        </motion.div>
      ) : (
        <X className="h-4 w-4 text-slate-300" />
      )}
    </motion.div>
  );
}

const EMERALD = {
  bg: "bg-emerald-50",
  icon: "text-emerald-600",
  text: "text-emerald-700",
  check: "text-emerald-500",
};

const RED = {
  bg: "bg-red-50",
  icon: "text-red-600",
  text: "text-red-700",
  check: "text-red-500",
};

export function VotingDashboard({
  buyerRelease,
  sellerRelease,
  arbitratorRelease,
  buyerRefund,
  arbitratorRefund,
  isDisputed,
}: VotingDashboardProps) {
  const releaseProgress = isDisputed
    ? Number(arbitratorRelease) + Number(buyerRelease || sellerRelease)
    : Number(buyerRelease) + Number(sellerRelease);
  const refundProgress = Number(buyerRefund) + Number(arbitratorRefund);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-emerald-700">
              Release Votes
            </CardTitle>
            <span className="font-mono text-xs text-slate-400">
              {releaseProgress}/2
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(releaseProgress / 2) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="h-full rounded-full bg-emerald-400"
            />
          </div>
          {isDisputed && (
            <p className="mt-2 text-[10px] text-slate-400">
              Requires the arbitrator plus either the buyer or seller.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          <VoteIndicator
            voted={buyerRelease}
            label="Buyer"
            icon={User}
            activeClass={EMERALD}
            delay={0.1}
          />
          <VoteIndicator
            voted={sellerRelease}
            label="Seller"
            icon={Store}
            activeClass={EMERALD}
            delay={0.15}
          />
          {isDisputed && (
            <VoteIndicator
              voted={arbitratorRelease}
              label="Arbitrator"
              icon={Scale}
              activeClass={EMERALD}
              delay={0.2}
            />
          )}
        </CardContent>
      </Card>

      {isDisputed && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-red-700">
                Refund Votes
              </CardTitle>
              <span className="font-mono text-xs text-slate-400">
                {refundProgress}/2
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(refundProgress / 2) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="h-full rounded-full bg-red-400"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <VoteIndicator
              voted={buyerRefund}
              label="Buyer"
              icon={User}
              activeClass={RED}
              delay={0.1}
            />
            <VoteIndicator
              voted={arbitratorRefund}
              label="Arbitrator"
              icon={Scale}
              activeClass={RED}
              delay={0.15}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
