import { ShieldCheck } from "lucide-react";

export function PrivacyFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-2xl px-4 py-6 text-xs text-neutral-400">
      <p className="flex items-start gap-1.5">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Confidentialité : aucune donnée personnelle n&apos;est requise. Le prénom est optionnel
          et le vote utilise un identifiant aléatoire stocké uniquement sur ton appareil (pas de
          fingerprinting navigateur, pas de cookie de suivi tiers).
        </span>
      </p>
    </footer>
  );
}
