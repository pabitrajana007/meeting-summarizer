"use client";

import { useState } from "react";
import type { ActionItem } from "@/lib/types";

export function ActionItems({ items }: { items: ActionItem[] }) {
  // local-only checkboxes, handy during a follow-up call
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!items.length) return <p className="text-muted">No action items were found in this meeting.</p>;

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
      {items.map((a, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => toggle(i)}
            className="mt-1 size-4 accent-[var(--accent)]"
            aria-label={`Mark "${a.task}" done`}
          />
          <div className="min-w-0 flex-1">
            <p className={checked.has(i) ? "text-muted line-through" : ""}>{a.task}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">{a.owner ?? "Unassigned"}</span>
              {a.due && <span className="rounded-full bg-line px-2 py-0.5 text-muted">Due: {a.due}</span>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
