"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/config/escrow-contract";
import type { EscrowState } from "@/types/escrow";

const contractConfig = {
  address: ESCROW_ADDRESS,
  abi: ESCROW_ABI,
} as const;

type ReadContractsEntry = {
  status?: "success" | "failure";
  result?: unknown;
  error?: Error | null;
};

function resultAt(
  data: readonly unknown[] | undefined,
  index: number
): ReadContractsEntry | undefined {
  return data?.[index] as ReadContractsEntry | undefined;
}

function firstEntryError(data: readonly unknown[] | undefined): Error | undefined {
  for (const entry of data ?? []) {
    const candidate = entry as ReadContractsEntry;
    if (candidate?.status === "failure" && candidate.error) return candidate.error;
  }
  return undefined;
}

export function useCurrentState() {
  return useReadContract({
    ...contractConfig,
    functionName: "currentState",
    query: { refetchInterval: 5000 },
  });
}

export function useContractRoles() {
  const result = useReadContracts({
    contracts: [
      { ...contractConfig, functionName: "buyer" },
      { ...contractConfig, functionName: "seller" },
      { ...contractConfig, functionName: "arbitrator" },
    ],
    query: { refetchInterval: 10000 },
  });

  return {
    buyer: resultAt(result.data, 0)?.result as `0x${string}` | undefined,
    seller: resultAt(result.data, 1)?.result as `0x${string}` | undefined,
    arbitrator: resultAt(result.data, 2)?.result as `0x${string}` | undefined,
    isLoading: result.isLoading,
    error: result.error ?? firstEntryError(result.data),
    refetch: result.refetch,
  };
}

export function useEscrowAmount() {
  return useReadContract({
    ...contractConfig,
    functionName: "amount",
    query: { refetchInterval: 5000 },
  });
}

export function useDeadline() {
  return useReadContract({
    ...contractConfig,
    functionName: "deadline",
    query: { refetchInterval: 5000 },
  });
}

export function useVoteStatus() {
  const result = useReadContract({
    ...contractConfig,
    functionName: "getVoteStatus",
    query: { refetchInterval: 3000 },
  });

  const data = result.data as
    | readonly [boolean, boolean, boolean, boolean, boolean]
    | undefined;

  return {
    buyerRelease: data?.[0] ?? false,
    sellerRelease: data?.[1] ?? false,
    arbitratorRelease: data?.[2] ?? false,
    buyerRefund: data?.[3] ?? false,
    arbitratorRefund: data?.[4] ?? false,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function usePendingWithdrawal(address: `0x${string}` | undefined) {
  return useReadContract({
    ...contractConfig,
    functionName: "pendingWithdrawals",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });
}

export function useExtensionInfo() {
  const result = useReadContracts({
    contracts: [
      { ...contractConfig, functionName: "extensionProposer" },
      { ...contractConfig, functionName: "proposedAdditionalSeconds" },
    ],
    query: { refetchInterval: 5000 },
  });

  const proposer = resultAt(result.data, 0)?.result as `0x${string}` | undefined;
  const seconds = resultAt(result.data, 1)?.result as bigint | undefined;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  return {
    extensionProposer: proposer,
    proposedAdditionalSeconds: seconds ?? 0n,
    hasPendingProposal: Boolean(proposer && proposer !== zeroAddress),
    isLoading: result.isLoading,
    error: result.error ?? firstEntryError(result.data),
    refetch: result.refetch,
  };
}

function firstError(...errors: Array<Error | null | undefined>) {
  return errors.find((error): error is Error => Boolean(error));
}

export function useEscrowData() {
  const state = useCurrentState();
  const roles = useContractRoles();
  const amount = useEscrowAmount();
  const deadline = useDeadline();
  const votes = useVoteStatus();
  const extension = useExtensionInfo();

  const currentState =
    state.data === undefined ? undefined : (state.data as EscrowState);
  const error = firstError(
    state.error,
    roles.error,
    amount.error,
    deadline.error,
    votes.error,
    extension.error
  );

  return {
    currentState,
    buyer: roles.buyer,
    seller: roles.seller,
    arbitrator: roles.arbitrator,
    amount: amount.data as bigint | undefined,
    deadline: deadline.data as bigint | undefined,
    votes,
    extension,
    isLoading:
      state.isLoading ||
      roles.isLoading ||
      amount.isLoading ||
      deadline.isLoading ||
      votes.isLoading ||
      extension.isLoading,
    error,
    refetchAll: () => {
      void state.refetch();
      void roles.refetch();
      void amount.refetch();
      void deadline.refetch();
      void votes.refetch();
      void extension.refetch();
    },
  };
}
