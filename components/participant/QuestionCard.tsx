import { User } from "lucide-react";
import type { QuestionDTO } from "@/lib/types";
import { VoteButton } from "@/components/participant/VoteButton";

export function QuestionCard({
  eventSlug,
  question,
}: {
  eventSlug: string;
  question: QuestionDTO;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <VoteButton eventSlug={eventSlug} questionId={question.id} votes={question.votes} />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-neutral-900">{question.content}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
          <User className="h-3.5 w-3.5" aria-hidden />
          <span>{question.authorName || "Anonyme"}</span>
          {question.status === "ANSWERED" && (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
              Répondu
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
