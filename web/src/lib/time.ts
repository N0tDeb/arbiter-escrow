const SECONDS_PER_MINUTE = 60n;
const SECONDS_PER_HOUR = 60n * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
// ECMAScript Date supports timestamps up to ±8.64e15 milliseconds.
const MAX_DATE_UNIX_SECONDS = 8_640_000_000_000n;

export function currentUnixSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function isDeadlineExpired(
  deadline: bigint,
  now = currentUnixSeconds()
): boolean {
  // Contract actions remain valid at exactly the deadline and expire only after it.
  return now > deadline;
}

export function remainingUntil(
  deadline: bigint,
  now = currentUnixSeconds()
): {
  expired: boolean;
  days: bigint;
  hours: bigint;
  minutes: bigint;
  seconds: bigint;
} {
  if (isDeadlineExpired(deadline, now)) {
    return { expired: true, days: 0n, hours: 0n, minutes: 0n, seconds: 0n };
  }

  const remaining = deadline - now;
  return {
    expired: false,
    days: remaining / SECONDS_PER_DAY,
    hours: (remaining % SECONDS_PER_DAY) / SECONDS_PER_HOUR,
    minutes: (remaining % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
    seconds: remaining % SECONDS_PER_MINUTE,
  };
}

export function formatUnixTimestamp(timestamp: bigint): string {
  if (timestamp > MAX_DATE_UNIX_SECONDS) {
    return `Unix ${timestamp.toString()}`;
  }

  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) {
    return `Unix ${timestamp.toString()}`;
  }
  return date.toLocaleString();
}

export function formatDurationCompact(totalSeconds: bigint): string {
  if (totalSeconds === 0n) return "0s";

  const days = totalSeconds / SECONDS_PER_DAY;
  const hours = (totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR;
  const minutes = (totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE;
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const parts: string[] = [];

  if (days > 0n) parts.push(`${days}d`);
  if (hours > 0n) parts.push(`${hours}h`);
  if (minutes > 0n) parts.push(`${minutes}m`);
  if (seconds > 0n) parts.push(`${seconds}s`);

  return parts.join(" ");
}
