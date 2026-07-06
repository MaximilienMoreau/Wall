import type { EventStats } from "@/lib/types";

export function StatsRow({ stats }: { stats: EventStats }) {
  const items = [
    { label: "Questions", value: stats.totalQuestions },
    { label: "En attente", value: stats.pending },
    { label: "Approuvées", value: stats.approved },
    { label: "Répondues", value: stats.answered },
    { label: "Votants", value: stats.voterCount },
    { label: "Thèmes", value: stats.groupCount },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-neutral-900">{item.value}</div>
          <div className="text-xs text-neutral-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
