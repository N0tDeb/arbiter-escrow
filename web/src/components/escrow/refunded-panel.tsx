"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export function RefundedPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-violet-200 bg-violet-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400" />
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 border border-violet-200"
          >
            <RotateCcw className="h-8 w-8 text-violet-600" />
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-violet-700">
              Funds Refunded
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              The escrow has been resolved with the buyer refund queued in the
              contract. The buyer can claim it from the Withdrawal Vault.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
