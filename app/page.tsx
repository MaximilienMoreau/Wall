import { MessageSquareText, Sparkles } from "lucide-react";
import { CreateEventForm } from "@/components/landing/CreateEventForm";
import { JoinEventForm } from "@/components/landing/JoinEventForm";
import { PrivacyFooter } from "@/components/PrivacyFooter";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-10 px-4 py-16 text-center">
        <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">
          <Sparkles className="h-4 w-4" aria-hidden />
          Regroupement des questions par IA
        </div>

        <div>
          <h1 className="flex items-center justify-center gap-3 text-4xl font-bold text-neutral-900 sm:text-5xl">
            <MessageSquareText className="h-10 w-10 text-accent" aria-hidden />
            Wall
          </h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-600">
            Le mur de questions collaboratif pour vos meetups : les participants posent leurs
            questions, l&apos;IA les regroupe par thème en temps réel.
          </p>
        </div>

        <CreateEventForm />

        <div className="flex w-full max-w-md items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          ou
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <JoinEventForm />
      </main>
      <PrivacyFooter />
    </div>
  );
}
