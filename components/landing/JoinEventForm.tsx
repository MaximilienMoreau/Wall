"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

function extractSlug(input: string): string {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/e\/([^/]+)/);
    if (match) return match[1];
  } catch {
    // pas une URL, on considère que c'est directement le code
  }
  return trimmed;
}

export function JoinEventForm() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const slug = extractSlug(code);
    if (!slug) return;
    router.push(`/e/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
      <label htmlFor="join-code" className="sr-only">
        Code de l&apos;événement
      </label>
      <input
        id="join-code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code de l'événement (ex : ai-first-x7k2)"
        className="flex-1 rounded-lg border border-neutral-300 p-2.5 text-neutral-900 focus:border-accent"
      />
      <Button type="submit" variant="secondary" disabled={!code.trim()}>
        Rejoindre <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
