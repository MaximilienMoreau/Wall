import { Layers, MessageCircleQuestion } from "lucide-react";
import type { QuestionGroupDTO } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function GroupsView({ groups }: { groups: QuestionGroupDTO[] }) {
  const visibleGroups = groups.filter((g) => (g.questionCount ?? g.questions.length) > 0);

  if (visibleGroups.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Aucun thème pour l'instant"
        description="L'IA regroupera automatiquement les questions similaires ici."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {visibleGroups.map((group) => (
        <li key={group.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {group.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden />
              {group.questionCount ?? group.questions.length}
            </span>
          </div>
          <p className="mt-2 text-neutral-900">{group.synthesizedQuestion}</p>
        </li>
      ))}
    </ul>
  );
}
