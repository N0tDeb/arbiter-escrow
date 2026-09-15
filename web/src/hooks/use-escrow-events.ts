"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/config/escrow-contract";
import { ESCROW_STATE_LABELS } from "@/config/escrow-state";
import { formatDurationCompact, formatUnixTimestamp } from "@/lib/time";
import type { EscrowEvent, EscrowState } from "@/types/escrow";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function eventDescription(
  type: EscrowEvent["type"],
  data: Record<string, unknown>
): string {
  switch (type) {
    case "Deposited":
      return `${truncateAddress(data.buyer as string)} deposited ${formatEther(data.amount as bigint)} ETH`;
    case "StateChanged":
      return `State changed from ${ESCROW_STATE_LABELS[data.from as EscrowState]} to ${ESCROW_STATE_LABELS[data.to as EscrowState]}`;
    case "DisputeRaised":
      return `Dispute raised: "${String(data.reason)}"`;
    case "DeadlineExtended":
      return `Deadline extended to ${formatUnixTimestamp(data.newDeadline as bigint)}`;
    case "ReleaseVoted":
      return `${truncateAddress(data.voter as string)} voted to release funds`;
    case "RefundVoted":
      return `${truncateAddress(data.voter as string)} voted for a refund`;
    case "FundsQueued":
      return `${formatEther(data.amount as bigint)} ETH queued for ${truncateAddress(data.recipient as string)}`;
    case "Withdrawn":
      return `${truncateAddress(data.recipient as string)} withdrew ${formatEther(data.amount as bigint)} ETH`;
    case "Cancelled":
      return `Escrow cancelled by ${truncateAddress(data.by as string)}`;
    case "ExtensionProposed":
      return `${truncateAddress(data.proposer as string)} proposed a ${formatDurationCompact(data.additionalSeconds as bigint)} extension`;
    case "ExtensionCancelled":
      return `Extension proposal cancelled by ${truncateAddress(data.by as string)}`;
  }
}

export function useLatestDisputeReason() {
  const publicClient = usePublicClient();
  const [reason, setReason] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(undefined);

      if (!publicClient) {
        if (!cancelled) {
          setReason(undefined);
          setIsLoading(false);
        }
        return;
      }

      try {
        const logs = await publicClient.getContractEvents({
          address: ESCROW_ADDRESS,
          abi: ESCROW_ABI,
          eventName: "DisputeRaised",
          fromBlock: 0n,
          toBlock: "latest",
        });
        const latest = logs.at(-1);
        if (!cancelled) {
          setReason(latest?.args.reason);
        }
      } catch (cause) {
        if (!cancelled) {
          setReason(undefined);
          setError(cause instanceof Error ? cause : new Error("Could not load dispute events."));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  return { reason, isLoading, error };
}

function compareEventsNewestFirst(a: EscrowEvent, b: EscrowEvent): number {
  if (a.blockNumber !== b.blockNumber) {
    return a.blockNumber > b.blockNumber ? -1 : 1;
  }
  return b.logIndex - a.logIndex;
}

export function useEscrowEvents() {
  const [events, setEvents] = useState<
    Array<EscrowEvent & { description: string }>
  >([]);

  const addEvent = useCallback(
    (
      type: EscrowEvent["type"],
      data: Record<string, unknown>,
      blockNumber: bigint,
      transactionHash: `0x${string}` | null,
      logIndex: number | null
    ) => {
      const normalizedLogIndex = logIndex ?? -1;
      const id = `${type}-${transactionHash ?? blockNumber}-${normalizedLogIndex}`;
      const event: EscrowEvent & { description: string } = {
        id,
        type,
        timestamp: Date.now(),
        data,
        blockNumber,
        logIndex: normalizedLogIndex,
        description: eventDescription(type, data),
      };

      setEvents((previous) => {
        if (previous.some((item) => item.id === id)) return previous;
        return [...previous, event].sort(compareEventsNewestFirst).slice(0, 50);
      });
    },
    []
  );

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "Deposited",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "Deposited",
          { buyer: log.args.buyer, amount: log.args.amount },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "StateChanged",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "StateChanged",
          { from: log.args.from, to: log.args.to },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "DisputeRaised",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "DisputeRaised",
          { by: log.args.by, reason: log.args.reason },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "DeadlineExtended",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "DeadlineExtended",
          { newDeadline: log.args.newDeadline },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "ReleaseVoted",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "ReleaseVoted",
          { voter: log.args.voter },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "RefundVoted",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "RefundVoted",
          { voter: log.args.voter },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "FundsQueued",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "FundsQueued",
          { recipient: log.args.recipient, amount: log.args.amount },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "Withdrawn",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "Withdrawn",
          { recipient: log.args.recipient, amount: log.args.amount },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "Cancelled",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "Cancelled",
          { by: log.args.by },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "ExtensionProposed",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "ExtensionProposed",
          {
            proposer: log.args.proposer,
            additionalSeconds: log.args.additionalSeconds,
          },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  useWatchContractEvent({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    eventName: "ExtensionCancelled",
    onLogs: (logs) =>
      logs.forEach((log) =>
        addEvent(
          "ExtensionCancelled",
          { by: log.args.by },
          log.blockNumber,
          log.transactionHash,
          log.logIndex
        )
      ),
  });

  return { events };
}
