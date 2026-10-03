import { CircleHelp, Gavel, ListChecks } from "lucide-react";
import type { Summary } from "@/lib/types";

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 leading-relaxed">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border-l-4 border-accent bg-accent-soft/60 p-4 text-lg leading-relaxed">
        {summary.tldr}
      </p>
      <Section icon={<ListChecks className="size-4" />} title="Key points" items={summary.key_points} />
      <Section icon={<Gavel className="size-4" />} title="Decisions" items={summary.decisions} />
      <Section icon={<CircleHelp className="size-4" />} title="Open questions" items={summary.open_questions} />
    </div>
  );
}
