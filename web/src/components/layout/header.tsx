"use client";

import { motion } from "framer-motion";
import { Scale, Shield, ShoppingCart, Store } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useParticipantRole } from "@/hooks/use-participant-role";
import { Badge } from "@/components/ui/badge";

const ROLE_CONFIG = {
  buyer: {
    label: "Buyer",
    icon: ShoppingCart,
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  seller: {
    label: "Seller",
    icon: Store,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  arbitrator: {
    label: "Arbitrator",
    icon: Scale,
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  spectator: {
    label: "Spectator",
    icon: Shield,
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Header() {
  const { role, isParty } = useParticipantRole();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const roleConfig = ROLE_CONFIG[role];
  const RoleIcon = roleConfig.icon;
  const injectedConnector = connectors.find(
    (connector) => connector.id !== "mock"
  );

  const handleWalletButton = () => {
    if (isConnected) {
      disconnect();
      return;
    }
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-sm"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-slate-900">
              Arbiter
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
              Local Hardhat Network
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isParty && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge
                variant="outline"
                className={`${roleConfig.className} gap-1.5 px-3 py-1 text-xs font-medium`}
              >
                <RoleIcon className="h-3 w-3" />
                {roleConfig.label}
              </Badge>
            </motion.div>
          )}
          <button
            onClick={handleWalletButton}
            disabled={!isConnected && (!injectedConnector || connectPending)}
            title={isConnected ? "Disconnect wallet" : "Connect browser wallet"}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
              }`}
            />
            {isConnected && address
              ? shortAddress(address)
              : connectPending
                ? "Connecting..."
                : "Connect Wallet"}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
