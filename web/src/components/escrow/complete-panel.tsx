"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export function CompletePanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-emerald-200 bg-emerald-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400" />
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-emerald-700">
              Transaction Complete
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              The escrow has been successfully resolved. The seller payout is
              queued in the contract. The seller can claim it from the
              Withdrawal Vault.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
