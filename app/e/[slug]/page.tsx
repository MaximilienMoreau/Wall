"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuestionForm } from "@/components/participant/QuestionForm";
import { QuestionCard } from "@/components/participant/QuestionCard";
import { GroupsView } from "@/components/participant/GroupsView";
import { PrivacyFooter } from "@/components/PrivacyFooter";
import type { PublicEventDTO, QuestionDTO, QuestionGroupDTO } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

type PublicState = {
  event: PublicEventDTO;
  questions: QuestionDTO[];
  groups: QuestionGroupDTO[];
};

export default function ParticipantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"questions" | "themes">("questions");

  const fetchState = useCallback(async (): Promise<PublicState> => {
    const res = await fetch(`/api/events/${slug}`, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status === 404 ? "not-found" : "server-error");
    return res.json();
  }, [slug]);

  const { data, error, loading, refetch } = usePolling(fetchState, POLL_INTERVAL_MS, [slug]);

  if (loading && !data) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4">
        <p className="text-neutral-400">Chargement…</p>
      </main>
    );
  }

  const isNotFound = error instanceof Error && error.message === "not-found";

  if (isNotFound || (!loading && !data)) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4">
        <EmptyState
          icon={AlertTriangle}
          title="Événement introuvable"
          description="Vérifie le code ou le lien qui t'a été communiqué."
        />
      </main>
    );
  }

  if (!data) return null;

  const { event, questions, groups } = data;

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
          {event.description && <p className="mt-1 text-neutral-500">{event.description}</p>}
        </header>

        <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <QuestionForm
            eventSlug={slug}
            allowAnonymous={event.allowAnonymous}
            isOpen={event.isOpen}
            onSubmitted={refetch}
          />
        </section>

        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: "questions", label: "Questions", badge: questions.length },
            { value: "themes", label: "Thèmes", badge: groups.length },
          ]}
        />

        <div className="mt-4">
          {tab === "questions" ? (
            questions.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="Aucune question, sois le premier !"
                description="Ta question apparaîtra ici dès qu'elle sera envoyée."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {questions.map((q) => (
                  <QuestionCard key={q.id} eventSlug={slug} question={q} />
                ))}
              </ul>
            )
          ) : (
            <GroupsView groups={groups} />
          )}
        </div>
      </main>
      <PrivacyFooter />
    </div>
  );
}
