"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { getStoredAdminToken, storeAdminToken } from "@/lib/client-storage";
import { moderateQuestion } from "@/lib/admin-client";
import type { PublicEventDTO, QuestionGroupDTO } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;

type PublicState = {
  event: PublicEventDTO;
  groups: QuestionGroupDTO[];
};

export default function WallPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [justAnswered, setJustAnswered] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Lecture de cookie/URL : ne peut se faire qu'après montage côté client, d'où l'effet
  // (le rendu serveur initial doit rester identique au premier rendu client).
  useEffect(() => {
    const fromQuery = searchParams.get("token");
    if (fromQuery) {
      storeAdminToken(slug, fromQuery);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(fromQuery);
      router.replace(`/e/${slug}/wall`);
      return;
    }
    setToken(getStoredAdminToken(slug));
  }, [slug, searchParams, router]);

  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/e/${slug}`, {
      width: 200,
      margin: 1,
      color: { dark: "#ffffff", light: "#00000000" },
    }).then(setQrDataUrl);
  }, [slug]);

  const fetchState = useCallback(async (): Promise<PublicState> => {
    const res = await fetch(`/api/events/${slug}`, { cache: "no-store" });
    if (!res.ok) throw new Error("not-found");
    const data = await res.json();
    return { event: data.event, groups: data.groups };
  }, [slug]);

  const { data } = usePolling(fetchState, POLL_INTERVAL_MS, [slug]);

  const groups = useMemo(
    () => [...(data?.groups ?? [])].sort((a, b) => a.order - b.order),
    [data]
  );
  // Si le nombre de thèmes diminue (fusion IA, groupe vidé), on se cale sur le dernier
  // thème disponible au rendu plutôt que de synchroniser ça via un effet séparé.
  const clampedIndex = groups.length === 0 ? 0 : Math.min(index, groups.length - 1);
  const current = groups[clampedIndex];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, Math.max(groups.length - 1, 0)));
  }, [groups.length]);

  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const markAnswered = useCallback(async () => {
    if (!token || !current) return;
    const targets = current.questions.filter((q) => q.status === "APPROVED");
    if (targets.length === 0) return;
    await Promise.all(targets.map((q) => moderateQuestion(q.id, token, { status: "ANSWERED" })));
    setJustAnswered(true);
    setTimeout(() => setJustAnswered(false), 1200);
  }, [token, current]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === " ") {
        e.preventDefault();
        markAnswered();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, markAnswered]);

  const allAnswered = current && current.questions.every((q) => q.status === "ANSWERED");

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-10 pt-8">
        <h1 className="text-xl font-medium text-neutral-400">{data?.event.title ?? "Wall"}</h1>
        {qrDataUrl && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">Rejoindre</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code de participation" className="h-16 w-16" />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-16 text-center">
        {!current ? (
          <div className="max-w-3xl">
            <p className="text-3xl text-neutral-400">En attente de questions…</p>
            <p className="mt-4 text-lg text-neutral-600">
              Scanne le QR code pour poser la première question.
            </p>
          </div>
        ) : (
          <div className={`max-w-5xl transition-opacity ${justAnswered ? "opacity-50" : ""}`}>
            <span className="inline-block rounded-full bg-white/10 px-5 py-2 text-xl font-semibold tracking-wide text-white">
              {current.label}
            </span>
            <p className="mt-10 text-5xl font-bold leading-tight sm:text-6xl">
              {current.synthesizedQuestion}
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 text-xl text-neutral-400">
              <span>{current.questionCount ?? current.questions.length} question(s)</span>
              {allAnswered && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" /> Répondu
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between px-10 pb-8 text-neutral-500">
        <button
          onClick={goPrev}
          disabled={clampedIndex === 0}
          aria-label="Thème précédent"
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-lg hover:bg-white/5 disabled:opacity-20"
        >
          <ChevronLeft className="h-6 w-6" /> Précédent
        </button>
        <span className="text-lg">
          {groups.length > 0 ? `${clampedIndex + 1} / ${groups.length}` : ""}
        </span>
        <button
          onClick={goNext}
          disabled={clampedIndex >= groups.length - 1}
          aria-label="Thème suivant"
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-lg hover:bg-white/5 disabled:opacity-20"
        >
          Suivant <ChevronRight className="h-6 w-6" />
        </button>
      </footer>
    </div>
  );
}
