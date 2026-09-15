"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { config } from "@/lib/wagmi-config";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={200}>
          {children}
          <Toaster
            theme="light"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                fontFamily: "var(--font-geist-sans), Inter, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              },
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
