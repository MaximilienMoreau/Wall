"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getFingerprint,
  getVotedQuestionIds,
  markQuestionVoted,
  unmarkQuestionVoted,
} from "@/lib/client-storage";
import { useToast } from "@/components/ui/Toast";

export function VoteButton({
  eventSlug,
  questionId,
  votes,
}: {
  eventSlug: string;
  questionId: string;
  votes: number;
}) {
  const [count, setCount] = useState(votes);
  const [voted, setVoted] = useState(() => getVotedQuestionIds(eventSlug).includes(questionId));
  const [pending, setPending] = useState(false);
  const { showToast } = useToast();

  // Resynchronise avec les votes des autres participants remontés par le polling.
  // Ignoré pendant une action locale en cours pour ne pas écraser la mise à jour optimiste.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending) setCount(votes);
  }, [votes, pending]);

  // Bloc 1 (Socle) : soutenir une question incrémente son compteur.
  async function vote() {
    setPending(true);
    setVoted(true);
    setCount((c) => c + 1);
    markQuestionVoted(eventSlug, questionId);

    try {
      const res = await fetch(`/api/questions/${questionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { votes: number };
      setCount(data.votes);
    } catch {
      setVoted(false);
      setCount((c) => c - 1);
      unmarkQuestionVoted(eventSlug, questionId);
      showToast("Impossible d'enregistrer le vote, réessaie.", "error");
    } finally {
      setPending(false);
    }
  }

  // Bloc 3 (Poussé) : on peut reprendre un soutien accordé, le compteur redescend.
  async function unvote() {
    setPending(true);
    setVoted(false);
    setCount((c) => Math.max(c - 1, 0));
    unmarkQuestionVoted(eventSlug, questionId);

    try {
      const res = await fetch(`/api/questions/${questionId}/vote`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: getFingerprint() }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { votes: number };
      setCount(data.votes);
    } catch {
      setVoted(true);
      setCount((c) => c + 1);
      markQuestionVoted(eventSlug, questionId);
      showToast("Impossible de retirer le vote, réessaie.", "error");
    } finally {
      setPending(false);
    }
  }

  function handleClick() {
    if (pending) return;
    if (voted) unvote();
    else vote();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={voted}
      aria-label={voted ? "Retirer mon soutien à cette question" : "Soutenir cette question"}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        voted
          ? "border-accent bg-accent/10 text-accent"
          : "border-neutral-300 text-neutral-600 hover:border-accent hover:text-accent"
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <ChevronUp className="h-4 w-4" aria-hidden />
      {count}
    </button>
  );
}
