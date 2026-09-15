"use client";

import { motion } from "framer-motion";
import { parseEther } from "viem";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Ban, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeposit, useCancelBeforeDeposit } from "@/hooks/use-escrow-actions";
import { useParticipantRole } from "@/hooks/use-participant-role";

const depositSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => {
      try {
        return parseEther(value) > 0n;
      } catch {
        return false;
      }
    }, "Enter a valid positive ETH amount with up to 18 decimals"),
});

type DepositForm = z.infer<typeof depositSchema>;

export function AwaitingPaymentPanel() {
  const { isBuyer, isSeller } = useParticipantRole();
  const { deposit, isProcessing: depositProcessing } = useDeposit();
  const { cancelBeforeDeposit, isProcessing: cancelProcessing } =
    useCancelBeforeDeposit();
  const actionProcessing = depositProcessing || cancelProcessing;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepositForm>({
    resolver: zodResolver(depositSchema),
  });

  const onSubmit = (data: DepositForm) => {
    deposit(data.amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="border-amber-200 bg-amber-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 border border-amber-200">
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Deposit Funds
              </CardTitle>
              <p className="text-xs text-slate-500">
                Send ETH to the escrow contract
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isBuyer ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="deposit-amount"
                  className="text-xs font-medium text-slate-600"
                >
                  Amount (ETH)
                </Label>
                <div className="relative">
                  <Input
                    id="deposit-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    className="border-amber-200 bg-white pr-12 font-mono text-slate-800 placeholder:text-slate-300 focus:border-amber-400 focus:ring-amber-200"
                    aria-invalid={Boolean(errors.amount)}
                    aria-describedby={errors.amount ? "deposit-amount-error" : undefined}
                    {...register("amount")}
                    disabled={actionProcessing}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-500">
                    ETH
                  </span>
                </div>
                {errors.amount && (
                  <p id="deposit-amount-error" className="text-xs text-red-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={actionProcessing}
                className="w-full bg-amber-500 text-white font-semibold shadow-sm hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {depositProcessing ? (
                  <>
                    <Skeleton className="h-4 w-4 rounded-full animate-spin bg-amber-300" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    Deposit
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-white p-4 text-center">
              <p className="text-sm text-slate-500">
                Only the buyer can deposit funds into this escrow.
              </p>
            </div>
          )}

          {(isBuyer || isSeller) && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-amber-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-amber-50 px-3 text-slate-400">or</span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => cancelBeforeDeposit()}
                disabled={actionProcessing}
                className="w-full border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                <Ban className="h-4 w-4" />
                {cancelProcessing ? "Cancelling..." : "Cancel Escrow"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
