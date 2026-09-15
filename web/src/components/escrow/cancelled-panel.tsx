"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export function CancelledPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
        <div className="h-1 bg-gradient-to-r from-slate-300 via-gray-300 to-slate-300" />
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white border border-slate-200"
          >
            <XCircle className="h-8 w-8 text-slate-400" />
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-600">
              Escrow Cancelled
            </h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              This escrow was cancelled before any funds were deposited.
              No funds were transferred.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
