"use client";

import { Check, EyeOff, CheckCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AdminGroupDTO } from "@/lib/admin-client";
import type { QuestionDTO } from "@/lib/types";

const STATUS_LABEL: Record<QuestionDTO["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  HIDDEN: "Masquée",
  ANSWERED: "Répondue",
};

const STATUS_CLASS: Record<QuestionDTO["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  HIDDEN: "bg-neutral-200 text-neutral-600",
  ANSWERED: "bg-accent/10 text-accent",
};

export function QuestionRow({
  question,
  groups,
  onStatusChange,
  onGroupChange,
}: {
  question: QuestionDTO;
  groups: AdminGroupDTO[];
  onStatusChange: (status: QuestionDTO["status"]) => void;
  onGroupChange: (groupId: string | null) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[question.status]}`}>
            {STATUS_LABEL[question.status]}
          </span>
          <span className="text-xs text-neutral-400">▲ {question.votes}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-neutral-900">{question.content}</p>
        <p className="mt-1 text-xs text-neutral-500">{question.authorName || "Anonyme"}</p>

        <label className="mt-2 block max-w-xs">
          <span className="sr-only">Groupe</span>
          <select
            value={question.groupId ?? ""}
            onChange={(e) => onGroupChange(e.target.value || null)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-700"
          >
            <option value="">Aucun groupe</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {question.status === "PENDING" && (
          <Button size="sm" variant="secondary" onClick={() => onStatusChange("APPROVED")}>
            <Check className="h-3.5 w-3.5" aria-hidden /> Approuver
          </Button>
        )}
        {question.status === "APPROVED" && (
          <Button size="sm" variant="secondary" onClick={() => onStatusChange("ANSWERED")}>
            <CheckCheck className="h-3.5 w-3.5" aria-hidden /> Marquer répondu
          </Button>
        )}
        {(question.status === "HIDDEN" || question.status === "ANSWERED") && (
          <Button size="sm" variant="secondary" onClick={() => onStatusChange("APPROVED")}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Rouvrir
          </Button>
        )}
        {question.status !== "HIDDEN" && (
          <Button size="sm" variant="ghost" onClick={() => onStatusChange("HIDDEN")}>
            <EyeOff className="h-3.5 w-3.5" aria-hidden /> Masquer
          </Button>
        )}
      </div>
    </li>
  );
}
