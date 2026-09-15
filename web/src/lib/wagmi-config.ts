import { createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected, mock } from "wagmi/connectors";

export const ESCROW_RPC_URL =
  process.env.NEXT_PUBLIC_HARDHAT_RPC_URL?.trim() || "http://127.0.0.1:8545";

export const ESCROW_CHAIN = {
  ...hardhat,
  rpcUrls: {
    default: { http: [ESCROW_RPC_URL] },
  },
} as const;

export const LOCAL_DEMO_ACCOUNTS = [
  { role: "Buyer", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
  { role: "Seller", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  { role: "Arbitrator", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
] as const;

export const config = createConfig({
  chains: [ESCROW_CHAIN],
  connectors: [
    injected(),
    ...LOCAL_DEMO_ACCOUNTS.map(({ address }) => mock({ accounts: [address] })),
  ],
  transports: {
    [ESCROW_CHAIN.id]: http(ESCROW_RPC_URL),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
