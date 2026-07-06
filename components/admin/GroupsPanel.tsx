"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AdminGroupDTO } from "@/lib/admin-client";

function EditableField({
  value,
  onSave,
  className,
  ariaLabel,
  multiline,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  ariaLabel: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  const commonProps = {
    value: draft,
    "aria-label": ariaLabel,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
    className: `w-full rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-neutral-200 focus:border-accent focus:bg-white ${className ?? ""}`,
  };

  return multiline ? <textarea {...commonProps} rows={2} /> : <input {...commonProps} type="text" />;
}

export function GroupsPanel({
  groups,
  onRename,
  onEditSynthesis,
  onReorder,
}: {
  groups: AdminGroupDTO[];
  onRename: (id: string, label: string) => void;
  onEditSynthesis: (id: string, synthesizedQuestion: string) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
}) {
  const sorted = [...groups].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Aucun thème pour l'instant"
        description="Utilise le bouton « Regrouper avec l'IA » pour créer des thèmes."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((group, index) => (
        <li key={group.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-1">
              <button
                type="button"
                aria-label="Monter ce thème"
                disabled={index === 0}
                onClick={() => onReorder(group.id, "up")}
                className="text-neutral-400 hover:text-accent disabled:opacity-20"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Descendre ce thème"
                disabled={index === sorted.length - 1}
                onClick={() => onReorder(group.id, "down")}
                className="text-neutral-400 hover:text-accent disabled:opacity-20"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <EditableField
                value={group.label}
                onSave={(v) => onRename(group.id, v)}
                ariaLabel={`Renommer le thème ${group.label}`}
                className="text-sm font-semibold text-accent"
              />
              <EditableField
                value={group.synthesizedQuestion}
                onSave={(v) => onEditSynthesis(group.id, v)}
                ariaLabel={`Question synthèse du thème ${group.label}`}
                className="text-sm text-neutral-800"
                multiline
              />
              <p className="px-2 text-xs text-neutral-400">{group.questions.length} question(s)</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
