import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitQuestionSchema } from "@/lib/validation";
import { normalizeForDuplicateCheck } from "@/lib/text";

type Params = { params: Promise<{ slug: string }> };

const RATE_LIMIT_WINDOW_MS = 30_000;

type CreateOutcome =
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "duplicate" }
  | { kind: "created"; question: Awaited<ReturnType<typeof prisma.question.create>> };

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

  // Rate-limit anti-spam et check de doublon ("Bloc 1 Socle" : deux questions au texte
  // identique — casse/accents/ponctuation ignorés — ne coexistent pas sur le mur) sont
  // faits dans la même transaction, derrière un verrou consultatif Postgres par événement.
  // Contrairement à un mutex en mémoire (cf. ancien lib/mutex.ts), ce verrou sérialise
  // correctement les soumissions concurrentes même entre plusieurs instances serverless
  // (déploiement Vercel) : il vit côté base de données, pas dans le process Node.
  const outcome = await prisma.$transaction(async (tx): Promise<CreateOutcome> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${event.id}))`;

    const lastFromFingerprint = await tx.question.findFirst({
      where: { eventId: event.id, fingerprint },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastFromFingerprint) {
      const elapsed = Date.now() - lastFromFingerprint.createdAt.getTime();
      if (elapsed < RATE_LIMIT_WINDOW_MS) {
        return { kind: "rate-limited", retryAfterMs: RATE_LIMIT_WINDOW_MS - elapsed };
      }
    }

    const normalizedContent = normalizeForDuplicateCheck(content);
    const activeQuestions = await tx.question.findMany({
      where: { eventId: event.id, status: { not: "HIDDEN" } },
      select: { content: true },
    });
    const isDuplicate = activeQuestions.some(
      (q) => normalizeForDuplicateCheck(q.content) === normalizedContent
    );
    if (isDuplicate) return { kind: "duplicate" };

    const question = await tx.question.create({
      data: {
        eventId: event.id,
        content,
        authorName,
        fingerprint,
        status: event.autoApprove ? "APPROVED" : "PENDING",
      },
    });
    return { kind: "created", question };
  });

  if (outcome.kind === "rate-limited") {
    return NextResponse.json(
      {
        error: "Merci de patienter avant d'envoyer une nouvelle question",
        retryAfterMs: outcome.retryAfterMs,
      },
      { status: 429 }
    );
  }

  if (outcome.kind === "duplicate") {
    return NextResponse.json(
      { error: "Cette question a déjà été posée sur ce mur." },
      { status: 409 }
    );
  }

  return NextResponse.json({ question: outcome.question }, { status: 201 });
}
