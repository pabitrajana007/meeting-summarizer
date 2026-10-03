"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Segment } from "@/lib/types";
import { formatTimestamp } from "@/lib/format";

export function TranscriptView({ segments, onSeek }: { segments: Segment[]; onSeek: (t: number) => void }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? segments.filter((s) => s.text.toLowerCase().includes(q)) : segments;
  }, [segments, query]);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 focus-within:border-accent">
        <Search className="size-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the transcript"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </label>

      <div className="space-y-1">
        {visible.map((s, i) => (
          <button
            key={i}
            onClick={() => onSeek(s.start)}
            className="flex w-full gap-4 rounded-lg px-2 py-2 text-left hover:bg-card"
            title="Play from here"
          >
            <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-accent">{formatTimestamp(s.start)}</span>
            <span className="leading-relaxed">{s.text}</span>
          </button>
        ))}
        {!visible.length && <p className="px-2 text-muted">No lines match &ldquo;{query}&rdquo;.</p>}
      </div>
    </div>
  );
}
