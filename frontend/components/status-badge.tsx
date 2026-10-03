import type { Status } from "@/lib/types";

const STYLES: Record<Status, string> = {
  queued: "bg-stone-500/10 text-stone-600 dark:text-stone-300",
  transcribing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  summarizing: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status }: { status: Status }) {
  const busy = status === "transcribing" || status === "summarizing" || status === "queued";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {busy && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}
