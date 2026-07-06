"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">Zone dangereuse</p>
      <p className="mt-1 text-xs text-red-600">
        Supprime définitivement l&apos;événement, ses questions, groupes et votes. Action
        irréversible.
      </p>
      <div className="mt-3">
        {!confirming ? (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Supprimer l&apos;événement
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={onDelete}>
              Confirmer la suppression définitive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
