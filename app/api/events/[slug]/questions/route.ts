import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitQuestionSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeForDuplicateCheck } from "@/lib/text";

type Params = { params: Promise<{ slug: string }> };

const RATE_LIMIT_WINDOW_MS = 30_000;

// POST /api/events/[slug]/questions : soumission d'une question par un participant.
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
  const isClosed = !event.isOpen || (event.closesAt !== null && event.closesAt <= new Date());
  if (isClosed) {
    return NextResponse.json({ error: "Les soumissions sont fermées pour cet événement" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = submitQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { content, authorName, fingerprint } = parsed.data;

  if (!event.allowAnonymous && !authorName) {
    return NextResponse.json(
      { error: "Le prénom est requis pour cet événement" },
      { status: 400 }
    );
  }

  // Bloc 1 (Socle) : deux questions au texte identique ne coexistent pas sur le mur.
  // "Identique" ignore la casse, les accents et la ponctuation (à trancher, cf. brief).
  const normalizedContent = normalizeForDuplicateCheck(content);
  const activeQuestions = await prisma.question.findMany({
    where: { eventId: event.id, status: { not: "HIDDEN" } },
    select: { content: true },
  });
  const isDuplicate = activeQuestions.some(
    (q) => normalizeForDuplicateCheck(q.content) === normalizedContent
  );
  if (isDuplicate) {
    return NextResponse.json(
      { error: "Cette question a déjà été posée sur ce mur." },
      { status: 409 }
    );
  }

  const rate = checkRateLimit(`question:${event.id}:${fingerprint}`, RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Merci de patienter avant d'envoyer une nouvelle question",
        retryAfterMs: rate.retryAfterMs,
      },
      { status: 429 }
    );
  }

  const question = await prisma.question.create({
    data: {
      eventId: event.id,
      content,
      authorName,
      status: event.autoApprove ? "APPROVED" : "PENDING",
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
