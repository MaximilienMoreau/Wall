"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ClusterPanel({
  onCluster,
  clustering,
  autoEnabled,
}: {
  onCluster: () => void;
  clustering: boolean;
  autoEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-800">Regroupement par IA</p>
        <p className="text-xs text-neutral-500">
          {autoEnabled
            ? "Le regroupement automatique est actif (toutes les 2 min tant que cette page admin reste ouverte)."
            : "Regroupe les questions approuvées en thèmes similaires."}
        </p>
      </div>
      <Button onClick={onCluster} loading={clustering} variant="secondary">
        <Sparkles className="h-4 w-4" aria-hidden />
        Regrouper avec l&apos;IA
      </Button>
    </div>
  );
}
