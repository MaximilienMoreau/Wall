import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateEventSchema } from "@/lib/validation";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";

type Params = { params: Promise<{ slug: string }> };

// GET /api/events/[slug] : état public, questions approuvées + groupes.
// Ne contient jamais l'adminToken.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const [questions, groups] = await Promise.all([
    prisma.question.findMany({
      where: { eventId: event.id, status: { in: ["APPROVED", "ANSWERED"] } },
      orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
    }),
    prisma.questionGroup.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: { status: { in: ["APPROVED", "ANSWERED"] } },
        },
      },
    }),
  ]);

  return NextResponse.json({
    event: {
      slug: event.slug,
      title: event.title,
      description: event.description,
      isOpen: event.isOpen,
      allowAnonymous: event.allowAnonymous,
      closesAt: event.closesAt,
    },
    questions,
    groups: groups.map((g) => ({
      id: g.id,
      label: g.label,
      synthesizedQuestion: g.synthesizedQuestion,
      order: g.order,
      questionCount: g.questions.length,
      questions: g.questions,
    })),
  });
}

// PATCH /api/events/[slug] : mise à jour des réglages (admin uniquement).
export async function PATCH(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: parsed.data,
  });

  return NextResponse.json({
    slug: updated.slug,
    title: updated.title,
    description: updated.description,
    isOpen: updated.isOpen,
    allowAnonymous: updated.allowAnonymous,
    autoApprove: updated.autoApprove,
    autoClusterEnabled: updated.autoClusterEnabled,
    closesAt: updated.closesAt,
  });
}

// DELETE /api/events/[slug] : suppression définitive de l'événement et de toutes ses données.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Cascade Prisma : questions, votes et groupes liés sont supprimés avec l'événement.
  await prisma.event.delete({ where: { id: event.id } });

  return NextResponse.json({ ok: true });
}
