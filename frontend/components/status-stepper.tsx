import { Check, Loader2 } from "lucide-react";
import type { Status } from "@/lib/types";

const STEPS: { key: Status; label: string; hint: string }[] = [
  { key: "queued", label: "Uploaded", hint: "Waiting in line" },
  { key: "transcribing", label: "Transcribing", hint: "Turning speech into text" },
  { key: "summarizing", label: "Summarizing", hint: "Finding decisions and action items" },
  { key: "done", label: "Done", hint: "" },
];

export function StatusStepper({ status }: { status: Status }) {
  const current = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="space-y-4 rounded-2xl border border-line bg-card p-6">
      {STEPS.map((step, i) => {
        const done = i < current || status === "done";
        const active = i === current && status !== "done";
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs
                ${done ? "border-accent bg-accent text-white" : active ? "border-accent text-accent" : "border-line text-muted"}`}
            >
              {done ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
            </span>
            <div>
              <p className={active || done ? "font-medium" : "text-muted"}>{step.label}</p>
              {active && step.hint && <p className="text-sm text-muted">{step.hint}…</p>}
            </div>
          </li>
        );
      })}
      <p className="pt-2 text-xs text-muted">
        This page updates automatically. Long recordings can take a few minutes on a laptop.
      </p>
    </ol>
  );
}
