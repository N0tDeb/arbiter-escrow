"use client";

import { useAccount } from "wagmi";
import { useContractRoles } from "./use-escrow-data";
import type { UserRole } from "@/types/escrow";

export function useParticipantRole(): {
  role: UserRole;
  isBuyer: boolean;
  isSeller: boolean;
  isArbitrator: boolean;
  isParty: boolean;
  isLoading: boolean;
} {
  const { address } = useAccount();
  const { buyer, seller, arbitrator, isLoading } = useContractRoles();

  if (!address || isLoading) {
    return {
      role: "spectator",
      isBuyer: false,
      isSeller: false,
      isArbitrator: false,
      isParty: false,
      isLoading,
    };
  }

  const connectedAddress = address.toLowerCase();
  const isBuyer = buyer?.toLowerCase() === connectedAddress;
  const isSeller = seller?.toLowerCase() === connectedAddress;
  const isArbitrator = arbitrator?.toLowerCase() === connectedAddress;

  let role: UserRole = "spectator";
  if (isBuyer) role = "buyer";
  else if (isSeller) role = "seller";
  else if (isArbitrator) role = "arbitrator";

  return {
    role,
    isBuyer,
    isSeller,
    isArbitrator,
    isParty: isBuyer || isSeller || isArbitrator,
    isLoading,
  };
}
