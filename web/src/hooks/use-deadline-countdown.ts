"use client";

import { useEffect, useState } from "react";
import { remainingUntil } from "@/lib/time";

const EMPTY_COUNTDOWN = {
  expired: false,
  days: 0n,
  hours: 0n,
  minutes: 0n,
  seconds: 0n,
};

export function useDeadlineCountdown(deadline: bigint | undefined) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (deadline === undefined) return EMPTY_COUNTDOWN;

  const nowSeconds = BigInt(Math.floor(nowMs / 1000));
  return remainingUntil(deadline, nowSeconds);
}
