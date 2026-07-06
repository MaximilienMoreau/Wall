"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getFingerprint } from "@/lib/client-storage";

const MAX_LENGTH = 500;

export function QuestionForm({
  eventSlug,
  allowAnonymous,
  isOpen,
  onSubmitted,
}: {
  eventSlug: string;
  allowAnonymous: boolean;
  isOpen: boolean;
  onSubmitted: () => void;
}) {
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventSlug}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          authorName: authorName.trim() || undefined,
          fingerprint: getFingerprint(),
        }),
      });

      if (res.status === 429) {
        const data = await res.json();
        const seconds = Math.ceil((data.retryAfterMs ?? 30000) / 1000);
        showToast(`Merci de patienter encore ${seconds}s avant d'envoyer une nouvelle question.`, "error");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error || "Impossible d'envoyer la question.", "error");
        return;
      }

      setContent("");
      showToast("Question envoyée, merci !", "success");
      onSubmitted();
    } catch {
      showToast("Erreur réseau, réessaie.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Les soumissions sont actuellement fermées pour cet événement.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="question-content" className="sr-only">
          Ta question
        </label>
        <textarea
          id="question-content"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Pose ta question ici…"
          rows={3}
          maxLength={MAX_LENGTH}
          required
          className="w-full resize-none rounded-xl border border-neutral-300 p-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-accent"
        />
        <div className="mt-1 text-right text-xs text-neutral-400">
          {content.length}/{MAX_LENGTH}
        </div>
      </div>

      {allowAnonymous && (
        <div>
          <label htmlFor="author-name" className="mb-1 block text-sm text-neutral-600">
            Prénom (optionnel)
          </label>
          <input
            id="author-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value.slice(0, 60))}
            placeholder="Anonyme"
            maxLength={60}
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-accent"
          />
        </div>
      )}
      {!allowAnonymous && (
        <div>
          <label htmlFor="author-name-required" className="mb-1 block text-sm text-neutral-600">
            Prénom
          </label>
          <input
            id="author-name-required"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value.slice(0, 60))}
            placeholder="Ton prénom"
            maxLength={60}
            required
            className="w-full rounded-xl border border-neutral-300 p-2.5 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-accent"
          />
        </div>
      )}

      <Button type="submit" size="lg" loading={submitting} disabled={!content.trim()}>
        <Send className="h-4 w-4" aria-hidden />
        Envoyer ma question
      </Button>
    </form>
  );
}
