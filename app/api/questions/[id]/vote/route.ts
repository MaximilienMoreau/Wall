import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { voteSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

const VOTE_RATE_LIMIT_WINDOW_MS = 1_000;

// Seules les questions visibles publiquement (cf. GET /api/events/[slug]) sont votables.
const VOTABLE_STATUSES = new Set(["APPROVED", "ANSWERED"]);

// POST /api/questions/[id]/vote : upvote. Anti double-vote via contrainte unique (questionId, fingerprint).
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }
  if (!VOTABLE_STATUSES.has(question.status)) {
    return NextResponse.json(
      { error: "Cette question n'est pas ouverte au vote" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fingerprint } = parsed.data;

  const rate = checkRateLimit(`vote:${id}:${fingerprint}`, VOTE_RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Merci de patienter avant de revoter", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.vote.create({ data: { questionId: id, fingerprint } });
      return tx.question.update({
        where: { id },
        data: { votes: { increment: 1 } },
      });
    });
    return NextResponse.json({ votes: updated.votes, alreadyVoted: false });
  } catch (err: unknown) {
    const isUniqueConflict =
      typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueConflict) {
      // Déjà voté : on renvoie l'état actuel sans re-compter (idempotent).
      return NextResponse.json({ votes: question.votes, alreadyVoted: true });
    }
    console.error("Erreur vote", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/questions/[id]/vote : Bloc 3 (Poussé), retirer son soutien.
// Retirer un soutien jamais accordé est sans effet : le compteur ne descend pas sous zéro.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { fingerprint } = parsed.data;

  const rate = checkRateLimit(`unvote:${id}:${fingerprint}`, VOTE_RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Merci de patienter avant de retirer ton soutien", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  const existingVote = await prisma.vote.findUnique({
    where: { questionId_fingerprint: { questionId: id, fingerprint } },
  });

  if (!existingVote) {
    // Rien à retirer : idempotent, pas d'erreur.
    return NextResponse.json({ votes: question.votes, wasVoted: false });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.vote.delete({ where: { id: existingVote.id } });
      return tx.question.update({
        where: { id },
        data: { votes: { decrement: 1 } },
      });
    });
    return NextResponse.json({ votes: Math.max(updated.votes, 0), wasVoted: true });
  } catch (err: unknown) {
    const isAlreadyDeleted =
      typeof err === "object" && err !== null && "code" in err && err.code === "P2025";
    if (isAlreadyDeleted) {
      // Déjà retiré entre-temps (double clic concurrent) : idempotent, pas d'erreur.
      const current = await prisma.question.findUnique({ where: { id } });
      return NextResponse.json({ votes: Math.max(current?.votes ?? 0, 0), wasVoted: true });
    }
    console.error("Erreur retrait de vote", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
