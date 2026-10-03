"use client";

import Link from "next/link";
import { toast } from "sonner";
import { FileAudio, Trash2 } from "lucide-react";
import { useDeleteMeeting, useMeetings } from "@/hooks/use-meeting";
import { errorMessage } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function MeetingList() {
  const { data, isLoading, error } = useMeetings();
  const del = useDeleteMeeting();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-line/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">{errorMessage(error)}</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-muted">No meetings yet. Upload your first recording above.</p>;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
      {data.map((m) => (
        <li key={m.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-background/60">
          <FileAudio className="size-5 shrink-0 text-muted" />
          <Link href={`/meetings/${m.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium">{m.title ?? m.filename}</p>
            <p className="truncate text-sm text-muted">
              {formatDate(m.created_at)} · {formatDuration(m.duration_seconds)}
              {m.title && <> · {m.filename}</>}
            </p>
          </Link>
          <StatusBadge status={m.status} />
          <button
            aria-label="Delete meeting"
            onClick={() =>
              confirm("Delete this meeting and its recording?") &&
              del.mutate(m.id, { onError: (e) => toast.error(errorMessage(e)) })
            }
            className="rounded-md p-1.5 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
