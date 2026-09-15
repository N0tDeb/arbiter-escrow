"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRaiseDispute } from "@/hooks/use-escrow-actions";

const disputeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please provide a detailed reason (min 10 characters)")
    .max(500, "Reason must be under 500 characters"),
});

type DisputeForm = z.infer<typeof disputeSchema>;

export function RaiseDisputeDialog({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const { raiseDispute, isProcessing } = useRaiseDispute();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset: resetForm,
  } = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
  });

  const reasonValue = useWatch({ control, name: "reason" });
  const reasonLength = reasonValue?.length ?? 0;

  const onSubmit = (data: DisputeForm) => {
    raiseDispute(data.reason.trim());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isProcessing) return;
    if (!nextOpen) resetForm();
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300"
          />
        }
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Raise Dispute
      </DialogTrigger>
      <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-md shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Raise a Dispute
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            This moves the escrow into dispute resolution and starts the
            seven-day arbitration period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="dispute-reason" className="text-xs font-medium text-slate-600">
              Reason for Dispute
            </Label>
            <Textarea
              id="dispute-reason"
              placeholder="Describe the issue in detail..."
              maxLength={500}
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? "dispute-reason-error" : undefined}
              className="min-h-[100px] resize-none border-slate-200 bg-white text-slate-800 placeholder:text-slate-300 focus:border-red-300"
              {...register("reason")}
              disabled={isProcessing}
            />
            <div className="flex justify-between">
              {errors.reason && (
                <p id="dispute-reason-error" className="text-xs text-red-600">
                  {errors.reason.message}
                </p>
              )}
              <p className="text-[10px] text-slate-400 ml-auto">
                {reasonLength}/500
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isProcessing}
              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
            >
              {isProcessing ? "Submitting..." : "Confirm Dispute"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
