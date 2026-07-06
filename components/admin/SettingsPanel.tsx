import { Toggle } from "@/components/ui/Toggle";
import type { AdminEventDTO } from "@/lib/types";

export function SettingsPanel({
  event,
  onChange,
}: {
  event: AdminEventDTO;
  onChange: (patch: Partial<AdminEventDTO>) => void;
}) {
  return (
    <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
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
    </div>
  );
}
