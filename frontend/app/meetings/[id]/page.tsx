"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, RotateCcw, TriangleAlert } from "lucide-react";
import { useMeeting, useRetryMeeting } from "@/hooks/use-meeting";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-stepper";
import { SummaryView } from "@/components/summary-view";
import { ActionItems } from "@/components/action-items";
import { TranscriptView } from "@/components/transcript-view";

type Tab = "summary" | "actions" | "transcript";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: meeting, isLoading, error } = useMeeting(id);
  const retry = useRetryMeeting(id);
  const [tab, setTab] = useState<Tab>("summary");
  const audioRef = useRef<HTMLAudioElement>(null);

  // toast once when processing finishes while the page is open
  const prevStatus = useRef(meeting?.status);
  useEffect(() => {
    if (prevStatus.current && prevStatus.current !== "done" && meeting?.status === "done") {
      toast.success("Your summary is ready");
    }
    prevStatus.current = meeting?.status;
  }, [meeting?.status]);

  const seek = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = t;
    void a.play();
  };

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-line/60" />;
  if (error || !meeting) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">{errorMessage(error)}</p>
      </div>
    );
  }

  const { summary, segments } = meeting;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "summary", label: "Summary" },
    { key: "actions", label: "Action items", count: summary?.action_items.length },
    { key: "transcript", label: "Transcript", count: segments?.length },
  ];

  return (
    <div className="space-y-8">
      <BackLink />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={meeting.status} />
          <span className="text-sm text-muted">
            {formatDate(meeting.created_at)} · {formatDuration(meeting.duration_seconds)} · {meeting.filename}
          </span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">{summary?.title ?? meeting.filename}</h1>
          {meeting.status === "done" && (
            <a
              href={api.exportUrl(meeting.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium hover:border-accent"
            >
              <Download className="size-4" /> Export Markdown
            </a>
          )}
        </div>
      </header>

      {meeting.status === "failed" && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <TriangleAlert className="mt-0.5 size-5 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Processing failed</p>
            <p className="break-words text-sm text-muted">{meeting.error}</p>
          </div>
          <button
            onClick={() => retry.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) })}
            disabled={retry.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <RotateCcw className="size-4" /> Retry
          </button>
        </div>
      )}

      {meeting.status !== "done" && meeting.status !== "failed" && <StatusStepper status={meeting.status} />}

      {meeting.status === "done" && summary && (
        <>
          <audio ref={audioRef} src={api.audioUrl(meeting.id)} controls preload="metadata" className="w-full" />

          <nav className="flex gap-1 border-b border-line">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors
                  ${tab === t.key ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label}
                {t.count != null && <span className="ml-1.5 text-xs text-muted">{t.count}</span>}
              </button>
            ))}
          </nav>

          {tab === "summary" && <SummaryView summary={summary} />}
          {tab === "actions" && <ActionItems items={summary.action_items} />}
          {tab === "transcript" && <TranscriptView segments={segments ?? []} onSeek={seek} />}
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="size-4" /> All meetings
    </Link>
  );
}
