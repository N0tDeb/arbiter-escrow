"use client";

import { motion } from "framer-motion";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { AlertTriangle, ArrowDownToLine, RefreshCw, Vault } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingWithdrawal } from "@/hooks/use-escrow-data";
import { useWithdraw } from "@/hooks/use-escrow-actions";

export function WithdrawalPanel() {
  const { address } = useAccount();
  const { data: pending, isLoading, error, refetch } = usePendingWithdrawal(address);
  const { withdraw, isProcessing } = useWithdraw();

  const balance = pending as bigint | undefined;
  const hasBalance = balance !== undefined && balance > 0n;

  if (!address) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card
        className={`border overflow-hidden shadow-sm ${
          hasBalance
            ? "border-indigo-200 bg-indigo-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400" />

        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                hasBalance
                  ? "bg-indigo-100 border-indigo-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <Vault
                className={`h-4 w-4 ${
                  hasBalance ? "text-indigo-600" : "text-slate-400"
                }`}
              />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Pending Withdrawal
              </CardTitle>
              <p className="text-xs text-slate-500">Your claimable balance</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-800">
                    Could not read your withdrawal balance
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Check the local node and contract connection, then try again.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refetch()}
                  className="border-amber-200 bg-white text-amber-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div
            className={`rounded-lg border p-4 text-center ${
              hasBalance
                ? "border-indigo-200 bg-white"
                : "border-slate-100 bg-slate-50"
            }`}
          >
            {isLoading ? (
              <Skeleton className="mx-auto h-8 w-32" />
            ) : error ? (
              <p className="font-mono text-sm font-semibold text-amber-700">Unavailable</p>
            ) : (
              <p
                className={`font-mono text-2xl font-bold ${
                  hasBalance ? "text-indigo-700" : "text-slate-400"
                }`}
              >
                {hasBalance ? formatEther(balance) : "0.0"}{" "}
                <span className="text-sm font-normal text-slate-400">ETH</span>
              </p>
            )}
          </div>

          {!error && hasBalance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={() => withdraw()}
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition-all"
              >
                <ArrowDownToLine className="h-4 w-4" />
                {isProcessing ? "Withdrawing..." : "Withdraw Funds"}
              </Button>
            </motion.div>
          )}

          {!error && !hasBalance && !isLoading && (
            <p className="text-center text-xs text-slate-400">
              No funds available for withdrawal
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
