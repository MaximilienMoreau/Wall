"use client";

import { FormEvent, useState } from "react";
import { Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

type CreatedEvent = { slug: string; adminToken: string };

export function CreateEventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState<"link" | null>(null);
  const { showToast } = useToast();

  const MIN_TITLE_LENGTH = 3;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < MIN_TITLE_LENGTH || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const fieldError = data?.details?.fieldErrors?.title?.[0] || data?.details?.fieldErrors?.description?.[0];
        showToast(fieldError || data?.error || "Impossible de créer l'événement.", "error");
        return;
      }
      const data = await res.json();
      setCreated({ slug: data.slug, adminToken: data.adminToken });
    } catch {
      showToast("Erreur réseau, réessaie.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    const adminUrl = `/e/${created.slug}/admin?token=${created.adminToken}`;
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="font-semibold text-emerald-900">Événement créé !</p>
        <p className="mt-1 text-sm text-emerald-800">
          Conserve précieusement ce lien admin : il ne sera plus jamais affiché.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-white p-2">
          <code className="flex-1 truncate text-xs text-neutral-700">{adminUrl}</code>
          <button
            type="button"
            aria-label="Copier le lien admin"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}${adminUrl}`);
              setCopied("link");
              setTimeout(() => setCopied(null), 2000);
            }}
            className="shrink-0 text-neutral-500 hover:text-neutral-800"
          >
            {copied === "link" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <Link href={adminUrl} className="mt-4 block">
          <Button className="w-full">
            Ouvrir le dashboard admin <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="event-title" className="mb-1 block text-sm font-medium text-neutral-700">
          Titre de l&apos;événement
        </label>
        <input
          id="event-title"
          type="text"
          required
          minLength={MIN_TITLE_LENGTH}
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="AI FIRST Meetup"
          className="w-full rounded-lg border border-neutral-300 p-2.5 text-neutral-900 focus:border-accent"
        />
        <p className="mt-1 text-xs text-neutral-400">{MIN_TITLE_LENGTH} caractères minimum</p>
      </div>
      <div className="mt-3">
        <label htmlFor="event-description" className="mb-1 block text-sm font-medium text-neutral-700">
          Description (optionnel)
        </label>
        <textarea
          id="event-description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="Une phrase pour situer l'événement"
          className="w-full resize-none rounded-lg border border-neutral-300 p-2.5 text-neutral-900 focus:border-accent"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        loading={submitting}
        disabled={title.trim().length < MIN_TITLE_LENGTH}
        className="mt-4 w-full"
      >
        Créer l&apos;événement
      </Button>
    </form>
  );
}
