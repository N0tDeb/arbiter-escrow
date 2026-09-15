"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StateBadge } from "./state-badge";
import { Copy, User, Store, Scale } from "lucide-react";
import { formatEther } from "viem";
import { toast } from "sonner";
import type { EscrowState } from "@/types/escrow";

function AddressRow({
  label,
  address,
  icon: Icon,
  iconClass,
  bgClass,
}: {
  label: string;
  address?: string;
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
}) {
  const copy = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy the address");
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md border ${bgClass}`}>
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      {address ? (
        <Tooltip>
          <TooltipTrigger
            onClick={() => void copy()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
            <Copy className="h-3 w-3 text-slate-400" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{address}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Skeleton className="h-5 w-28" />
      )}
    </div>
  );
}

interface ContractInfoProps {
  currentState: EscrowState;
  buyer?: string;
  seller?: string;
  arbitrator?: string;
  amount?: bigint;
  isLoading: boolean;
}

export function ContractInfo({
  currentState,
  buyer,
  seller,
  arbitrator,
  amount,
  isLoading,
}: ContractInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-5 p-5">
          {/* State + Amount */}
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Contract State
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <StateBadge state={currentState} />
              )}
            </div>
            <div className="text-right">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Escrowed
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className="font-mono text-lg font-bold text-slate-900">
                  {amount ? formatEther(amount) : "0"}{" "}
                  <span className="text-xs font-normal text-slate-400">ETH</span>
                </p>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-slate-100" />

          {/* Addresses */}
          <div className="space-y-3">
            <AddressRow
              label="Buyer"
              address={buyer}
              icon={User}
              iconClass="text-blue-600"
              bgClass="bg-blue-50 border-blue-100"
            />
            <AddressRow
              label="Seller"
              address={seller}
              icon={Store}
              iconClass="text-emerald-600"
              bgClass="bg-emerald-50 border-emerald-100"
            />
            <AddressRow
              label="Arbitrator"
              address={arbitrator}
              icon={Scale}
              iconClass="text-violet-600"
              bgClass="bg-violet-50 border-violet-100"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
