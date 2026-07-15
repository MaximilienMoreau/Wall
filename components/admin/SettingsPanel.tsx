"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import type { AdminEventDTO } from "@/lib/types";

/** ISO string -> valeur locale pour <input type="datetime-local"> (pas de secondes/fuseau). */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsPanel({
  event,
  onChange,
}: {
  event: AdminEventDTO;
  onChange: (patch: Partial<AdminEventDTO>) => void;
}) {
  const closesAtPassed = event.closesAt !== null && new Date(event.closesAt) <= new Date();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== event.title) onChange({ title: trimmed });
    else setTitle(event.title);
  }

  function commitDescription() {
    const trimmed = description.trim();
    if (trimmed !== (event.description ?? "")) onChange({ description: trimmed || null });
  }

  return (
    <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 pb-4">
        <div>
          <label htmlFor="event-title" className="mb-1 block text-sm font-medium text-neutral-700">
            Titre
          </label>
          <input
            id="event-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            onBlur={commitTitle}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="event-description" className="mb-1 block text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            onBlur={commitDescription}
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-accent"
          />
        </div>
      </div>
      <Toggle
        checked={event.isOpen}
        onChange={(v) => onChange({ isOpen: v })}
        label="Soumissions ouvertes"
        description="Désactive pour empêcher l'envoi de nouvelles questions."
      />
      <Toggle
        checked={event.allowAnonymous}
        onChange={(v) => onChange({ allowAnonymous: v })}
        label="Prénom optionnel"
        description="Si désactivé, le prénom devient obligatoire."
      />
      <Toggle
        checked={event.autoApprove}
        onChange={(v) => onChange({ autoApprove: v })}
        label="Auto-approbation"
        description="Les nouvelles questions apparaissent immédiatement sans modération."
      />
      <Toggle
        checked={event.autoClusterEnabled}
        onChange={(v) => onChange({ autoClusterEnabled: v })}
        label="Regroupement IA automatique"
        description="Relance le regroupement toutes les 2 minutes tant que cette page admin est ouverte."
      />
      <div className="flex items-start justify-between gap-4 py-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-neutral-800">Fermeture automatique</span>
          <span className="block text-xs text-neutral-500">
            {closesAtPassed
              ? "Date dépassée : les soumissions sont fermées, même si le bascule ci-dessus est actif."
              : "Optionnel. Une fois cette date passée, les soumissions se ferment automatiquement."}
          </span>
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(event.closesAt)}
            onChange={(e) => {
              const value = e.target.value;
              onChange({ closesAt: value ? new Date(value).toISOString() : null });
            }}
            aria-label="Date de fermeture automatique"
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700"
          />
          {event.closesAt && (
            <button
              type="button"
              onClick={() => onChange({ closesAt: null })}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Retirer la date
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
