"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { ESCROW_ABI, ESCROW_ADDRESS } from "@/config/escrow-contract";
import { parseContractError } from "@/lib/errors";

const contractConfig = {
  address: ESCROW_ADDRESS,
  abi: ESCROW_ABI,
} as const;

function useEscrowWrite(actionName: string) {
  const queryClient = useQueryClient();
  const {
    writeContract,
    data: hash,
    isPending,
    reset: resetWrite,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });
  const [isInFlight, setIsInFlight] = useState(false);
  const inFlightRef = useRef(false);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  type WriteArgs = Parameters<typeof writeContract>[0];

  const clearInFlight = useCallback(() => {
    inFlightRef.current = false;
    setIsInFlight(false);
  }, []);

  useEffect(() => {
    if (!isSuccess || toastIdRef.current === undefined) return;

    const toastId = toastIdRef.current;
    toast.success(`${actionName} confirmed`, {
      id: toastId,
      description: "Transaction confirmed on the local chain.",
    });

    // Keep the action locked until active contract reads have refreshed from
    // the confirming block. The ref check prevents an older completion from
    // unlocking a newer transaction if the hook is reused quickly.
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["readContract"] }),
      queryClient.invalidateQueries({ queryKey: ["readContracts"] }),
    ]).finally(() => {
      if (toastIdRef.current !== toastId) return;
      toastIdRef.current = undefined;
      clearInFlight();
    });
  }, [actionName, clearInFlight, isSuccess, queryClient]);

  useEffect(() => {
    if (!isReceiptError || !receiptError || toastIdRef.current === undefined) {
      return;
    }

    toast.error(parseContractError(receiptError), { id: toastIdRef.current });
    toastIdRef.current = undefined;
    clearInFlight();
  }, [clearInFlight, isReceiptError, receiptError]);

  // Preserve wagmi's generic write signature at the wrapper boundary.
  // Extracting `Parameters<typeof writeContract>` alone collapses the ABI-aware
  // payable/nonpayable relationship and incorrectly rejects `value` for deposit.
  const execute = useCallback(
    (args: WriteArgs) => {
      // Mutation state is asynchronous. Keep a synchronous guard so a rapid
      // double-click cannot submit the same contract action twice.
      if (inFlightRef.current) return;

      resetWrite();
      inFlightRef.current = true;
      setIsInFlight(true);

      const toastId = toast.loading(`${actionName}...`);
      toastIdRef.current = toastId;

      try {
        writeContract(args, {
          onSuccess: () => {
            toast.loading(`${actionName} submitted`, {
              id: toastId,
              description: "Waiting for confirmation...",
            });
          },
          onError: (error) => {
            toast.error(parseContractError(error), { id: toastId });
            toastIdRef.current = undefined;
            clearInFlight();
            resetWrite();
          },
        });
      } catch (error) {
        toast.error(parseContractError(error), { id: toastId });
        toastIdRef.current = undefined;
        clearInFlight();
        resetWrite();
      }
    },
    [actionName, clearInFlight, resetWrite, writeContract]
  ) as typeof writeContract;

  const reset = useCallback(() => {
    toastIdRef.current = undefined;
    clearInFlight();
    resetWrite();
  }, [clearInFlight, resetWrite]);

  return {
    execute,
    hash,
    isPending,
    isConfirming,
    isProcessing: isInFlight || isPending || isConfirming,
    isSuccess,
    reset,
  };
}

export function useDeposit() {
  const writer = useEscrowWrite("Depositing funds");

  const deposit = useCallback(
    (ethAmount: string) => {
      try {
        const value = parseEther(ethAmount.trim());
        writer.execute({
          ...contractConfig,
          functionName: "deposit",
          value,
        });
      } catch {
        toast.error("Enter a valid ETH amount with up to 18 decimal places.");
      }
    },
    [writer]
  );

  return { ...writer, deposit };
}

export function useApproveRelease() {
  const writer = useEscrowWrite("Approving release");

  const approveRelease = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "approveRelease",
    });
  }, [writer]);

  return { ...writer, approveRelease };
}

export function useApproveRefund() {
  const writer = useEscrowWrite("Approving refund");

  const approveRefund = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "approveRefund",
    });
  }, [writer]);

  return { ...writer, approveRefund };
}

export function useRaiseDispute() {
  const writer = useEscrowWrite("Raising dispute");

  const raiseDispute = useCallback(
    (reason: string) => {
      writer.execute({
        ...contractConfig,
        functionName: "raiseDispute",
        args: [reason],
      });
    },
    [writer]
  );

  return { ...writer, raiseDispute };
}

export function useProposeExtension() {
  const writer = useEscrowWrite("Proposing extension");

  const proposeExtension = useCallback(
    (additionalSeconds: bigint) => {
      writer.execute({
        ...contractConfig,
        functionName: "proposeExtension",
        args: [additionalSeconds],
      });
    },
    [writer]
  );

  return { ...writer, proposeExtension };
}

export function useAcceptExtension() {
  const writer = useEscrowWrite("Accepting extension");

  const acceptExtension = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "acceptExtension",
    });
  }, [writer]);

  return { ...writer, acceptExtension };
}

export function useCancelExtension() {
  const writer = useEscrowWrite("Cancelling extension");

  const cancelExtension = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "cancelExtensionProposal",
    });
  }, [writer]);

  return { ...writer, cancelExtension };
}

export function useClaimTimeout() {
  const writer = useEscrowWrite("Claiming timeout");

  const claimTimeout = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "claimTimeout",
    });
  }, [writer]);

  return { ...writer, claimTimeout };
}

export function useClaimArbitrationTimeout() {
  const writer = useEscrowWrite("Claiming arbitration timeout");

  const claimArbitrationTimeout = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "claimArbitrationTimeout",
    });
  }, [writer]);

  return { ...writer, claimArbitrationTimeout };
}

export function useCancelBeforeDeposit() {
  const writer = useEscrowWrite("Cancelling escrow");

  const cancelBeforeDeposit = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "cancelBeforeDeposit",
    });
  }, [writer]);

  return { ...writer, cancelBeforeDeposit };
}

export function useWithdraw() {
  const writer = useEscrowWrite("Withdrawing funds");

  const withdraw = useCallback(() => {
    writer.execute({
      ...contractConfig,
      functionName: "withdraw",
    });
  }, [writer]);

  return { ...writer, withdraw };
}
