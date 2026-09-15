"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { AlertTriangle, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEscrowData } from "@/hooks/use-escrow-data";
import { ESCROW_CHAIN, LOCAL_DEMO_ACCOUNTS } from "@/lib/wagmi-config";
import { ContractInfo } from "./contract-info";
import { AwaitingPaymentPanel } from "./awaiting-payment-panel";
import { AwaitingDeliveryPanel } from "./awaiting-delivery-panel";
import { DisputePanel } from "./dispute-panel";
import { CompletePanel } from "./complete-panel";
import { RefundedPanel } from "./refunded-panel";
import { CancelledPanel } from "./cancelled-panel";
import { WithdrawalPanel } from "./withdrawal-panel";
import { ActivityFeed } from "./activity-feed";
import type { EscrowState, VoteStatus } from "@/types/escrow";

function ConnectPrompt() {
  const { connectors, connect, isPending: connectPending } = useConnect();
  const mockConnectors = connectors.filter((connector) => connector.id === "mock");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center gap-6 py-24"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 shadow-sm">
        <Wallet className="h-9 w-9 text-indigo-500" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Connect Your Wallet</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">
          Connect to the local Hardhat network to interact with the escrow.
        </p>
      </div>

      {connectors.find((connector) => connector.id !== "mock") && (
        <button
          onClick={() => {
            const connector = connectors.find((item) => item.id !== "mock");
            if (connector) connect({ connector });
          }}
          disabled={connectPending}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Wallet className="h-4 w-4" />
          {connectPending ? "Connecting..." : "Connect Browser Wallet"}
        </button>
      )}

      {mockConnectors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex w-full max-w-sm flex-col items-center gap-3 border-t border-slate-200 pt-6"
        >
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Local Demo Accounts
          </p>
          <div className="grid w-full grid-cols-3 gap-2">
            {mockConnectors.slice(0, LOCAL_DEMO_ACCOUNTS.length).map((connector, index) => {
              const account = LOCAL_DEMO_ACCOUNTS[index];

              return (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={connectPending}
                  title={`${account.role}: ${account.address}`}
                  className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all active:scale-95 ${
                    index === 0
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      : index === 1
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {account.role}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatusPanel({
  title,
  description,
  details,
  loading = false,
  onRetry,
}: {
  title: string;
  description: string;
  details?: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              loading ? "bg-indigo-50" : "bg-amber-50"
            }`}
          >
            {loading ? (
              <LoaderCircle className="h-6 w-6 animate-spin text-indigo-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            {details && (
              <p className="mt-3 break-words font-mono text-xs text-slate-400">
                {details}
              </p>
            )}
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatePanel({
  state,
  deadline,
  votes,
}: {
  state: EscrowState;
  deadline?: bigint;
  votes: VoteStatus;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {state === 0 && <AwaitingPaymentPanel />}
        {state === 1 && <AwaitingDeliveryPanel deadline={deadline} votes={votes} />}
        {state === 2 && <CompletePanel />}
        {state === 3 && <RefundedPanel />}
        {state === 4 && <DisputePanel deadline={deadline} votes={votes} />}
        {state === 5 && <CancelledPanel />}
      </motion.div>
    </AnimatePresence>
  );
}

export function EscrowDashboard() {
  const { isConnected, chainId } = useAccount();
  const data = useEscrowData();

  if (!isConnected) {
    return <ConnectPrompt />;
  }

  if (chainId !== ESCROW_CHAIN.id) {
    return (
      <StatusPanel
        title="Wrong Network"
        description={`Switch your wallet to ${ESCROW_CHAIN.name} (chain ID ${ESCROW_CHAIN.id}).`}
      />
    );
  }

  if (data.currentState === undefined && data.isLoading) {
    return (
      <StatusPanel
        title="Loading Escrow"
        description="Reading the deployed contract from the local Hardhat network."
        loading
      />
    );
  }

  if (data.error || data.currentState === undefined) {
    return (
      <StatusPanel
        title="Escrow Contract Unavailable"
        description="Make sure the Hardhat node is running and the contract has been deployed with npm run deploy."
        details={data.error?.message}
        onRetry={data.refetchAll}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid gap-6 lg:grid-cols-12"
      >
        <div className="lg:col-span-3 space-y-6">
          <ContractInfo
            currentState={data.currentState}
            buyer={data.buyer}
            seller={data.seller}
            arbitrator={data.arbitrator}
            amount={data.amount}
            isLoading={data.isLoading}
          />
          <WithdrawalPanel />
        </div>

        <div className="lg:col-span-5">
          <StatePanel
            state={data.currentState}
            deadline={data.deadline}
            votes={data.votes}
          />
        </div>

        <div className="lg:col-span-4">
          <ActivityFeed />
        </div>
      </motion.div>
    </div>
  );
}
