"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEscrowEvents } from "@/hooks/use-escrow-events";
import {
  ArrowDownToLine,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  RotateCcw,
  XCircle,
  Zap,
  Vote,
  Activity,
} from "lucide-react";
import type { EscrowEvent } from "@/types/escrow";

const EVENT_CONFIG: Record<
  EscrowEvent["type"],
  { icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  Deposited: { icon: ArrowUpRight, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-100" },
  StateChanged: { icon: Zap, colorClass: "text-blue-600", bgClass: "bg-blue-50 border-blue-100" },
  DisputeRaised: { icon: AlertTriangle, colorClass: "text-red-600", bgClass: "bg-red-50 border-red-100" },
  DeadlineExtended: { icon: Clock, colorClass: "text-amber-600", bgClass: "bg-amber-50 border-amber-100" },
  ReleaseVoted: { icon: CheckCircle, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-100" },
  RefundVoted: { icon: RotateCcw, colorClass: "text-orange-600", bgClass: "bg-orange-50 border-orange-100" },
  FundsQueued: { icon: ArrowDownToLine, colorClass: "text-indigo-600", bgClass: "bg-indigo-50 border-indigo-100" },
  Withdrawn: { icon: ArrowDownToLine, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 border-emerald-100" },
  Cancelled: { icon: XCircle, colorClass: "text-slate-500", bgClass: "bg-slate-50 border-slate-100" },
  ExtensionProposed: { icon: Clock, colorClass: "text-cyan-600", bgClass: "bg-cyan-50 border-cyan-100" },
  ExtensionCancelled: { icon: XCircle, colorClass: "text-slate-500", bgClass: "bg-slate-50 border-slate-100" },
};

function EventItem({
  event,
  now,
}: {
  event: EscrowEvent & { description: string };
  now: number;
}) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const timeAgo = getTimeAgo(event.timestamp, now);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-slate-50"
    >
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${config.bgClass}`}>
        <Icon className={`h-3.5 w-3.5 ${config.colorClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-700 leading-relaxed">
          {event.description}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo}</p>
      </div>
    </motion.div>
  );
}

function getTimeAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ActivityFeed() {
  const { events } = useEscrowEvents();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
              <Activity className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800">
                Activity Feed
              </CardTitle>
              <p className="text-xs text-slate-500">
                Live contract events
              </p>
            </div>
            {events.length > 0 && (
              <Vote className="ml-auto h-3 w-3 text-violet-400 animate-pulse" />
            )}
          </div>
        </CardHeader>

        <CardContent className="max-h-[400px] overflow-y-auto space-y-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
                <Activity className="h-5 w-5 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">No events yet</p>
                <p className="text-xs text-slate-300 mt-1">
                  New contract events will appear here
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {events.map((event) => (
                <EventItem key={event.id} event={event} now={now} />
              ))}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
