"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Clock, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAcceptExtension,
  useCancelExtension,
  useProposeExtension,
} from "@/hooks/use-escrow-actions";
import { useExtensionInfo } from "@/hooks/use-escrow-data";
import { useParticipantRole } from "@/hooks/use-participant-role";
import { formatDurationCompact } from "@/lib/time";

const wholeNumber = z.string().regex(/^\d+$/, "Enter a whole number");
const extensionSchema = z
  .object({
    days: wholeNumber,
    hours: wholeNumber,
  })
  .refine((data) => BigInt(data.days) > 0n || BigInt(data.hours) > 0n, {
    message: "Extension must be greater than zero",
    path: ["hours"],
  });

type ExtensionForm = z.infer<typeof extensionSchema>;

function toBigIntOrZero(value: string | undefined) {
  return value && /^\d+$/.test(value) ? BigInt(value) : 0n;
}

interface ExtensionProposalProps {
  isExpired?: boolean;
}

export function ExtensionProposal({ isExpired = false }: ExtensionProposalProps) {
  const { address } = useAccount();
  const { isBuyer, isSeller } = useParticipantRole();
  const { hasPendingProposal, extensionProposer, proposedAdditionalSeconds } =
    useExtensionInfo();
  const { proposeExtension, isProcessing: proposeProcessing } =
    useProposeExtension();
  const { acceptExtension, isProcessing: acceptProcessing } =
    useAcceptExtension();
  const { cancelExtension, isProcessing: cancelProcessing } =
    useCancelExtension();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ExtensionForm>({
    resolver: zodResolver(extensionSchema),
    defaultValues: { days: "0", hours: "0" },
  });

  const watchedDays = useWatch({ control, name: "days" });
  const watchedHours = useWatch({ control, name: "hours" });
  const totalSeconds =
    toBigIntOrZero(watchedDays) * 86400n + toBigIntOrZero(watchedHours) * 3600n;

  const onSubmit = (data: ExtensionForm) => {
    const submittedSeconds = BigInt(data.days) * 86400n + BigInt(data.hours) * 3600n;
    proposeExtension(submittedSeconds);
  };

  const isProcessing = proposeProcessing || acceptProcessing || cancelProcessing;
  const canPropose = (isBuyer || isSeller) && !hasPendingProposal && !isExpired;
  const isOwnProposal = Boolean(
    address &&
      extensionProposer &&
      address.toLowerCase() === extensionProposer.toLowerCase()
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 border border-cyan-100">
            <Clock className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <CardTitle className="text-xs font-semibold text-slate-700">
            Deadline Extension
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {hasPendingProposal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-600">
                Pending Proposal
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDurationCompact(proposedAdditionalSeconds)} extension
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Proposed by{" "}
                <span className="font-mono text-slate-700">
                  {extensionProposer?.slice(0, 6)}...
                  {extensionProposer?.slice(-4)}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              {!isExpired && !isOwnProposal && (isBuyer || isSeller) && (
                <Button
                  size="sm"
                  onClick={() => acceptExtension()}
                  disabled={isProcessing}
                  className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                >
                  <Check className="h-3.5 w-3.5" />
                  {acceptProcessing ? "Accepting..." : "Accept"}
                </Button>
              )}
              {isOwnProposal && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelExtension()}
                  disabled={isProcessing}
                  className="flex-1 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  {cancelProcessing ? "Cancelling..." : "Cancel"}
                </Button>
              )}
            </div>
            {isExpired && (
              <p className="text-xs text-amber-700">
                The delivery deadline has expired, so this proposal can no longer be accepted.
              </p>
            )}
          </motion.div>
        ) : canPropose ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="extension-days" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Days
                </Label>
                <Input
                  id="extension-days"
                  type="number"
                  min="0"
                  step="1"
                  className="border-slate-200 bg-white font-mono text-sm text-slate-800"
                  aria-invalid={Boolean(errors.days)}
                  disabled={isProcessing}
                  {...register("days")}
                />
                {errors.days && (
                  <p className="text-xs text-red-600">{errors.days.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extension-hours" className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Hours
                </Label>
                <Input
                  id="extension-hours"
                  type="number"
                  min="0"
                  step="1"
                  className="border-slate-200 bg-white font-mono text-sm text-slate-800"
                  aria-invalid={Boolean(errors.hours)}
                  disabled={isProcessing}
                  {...register("hours")}
                />
                {errors.hours && (
                  <p className="text-xs text-red-600">{errors.hours.message}</p>
                )}
              </div>
            </div>
            {totalSeconds > 0n && (
              <p className="text-[10px] text-slate-400 font-mono">
                = {totalSeconds.toLocaleString()} seconds
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isProcessing}
              className="w-full bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
            >
              <Plus className="h-3.5 w-3.5" />
              {proposeProcessing ? "Proposing..." : "Propose Extension"}
            </Button>
          </form>
        ) : (
          <p className="py-2 text-center text-xs text-slate-400">
            {isExpired
              ? "The delivery deadline has expired; extensions are closed."
              : "Only the buyer or seller can propose an extension."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
