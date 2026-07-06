import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";

type Params = { params: Promise<{ slug: string }> };

// GET /api/events/[slug]/admin : vue complète pour le dashboard admin
// (toutes les questions quel que soit leur statut, réglages, stats).
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [questions, groups, voterCount] = await Promise.all([
    prisma.question.findMany({
      where: { eventId: event.id },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.questionGroup.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      include: { questions: true },
    }),
    prisma.vote.groupBy({
      by: ["fingerprint"],
      where: { question: { eventId: event.id } },
    }),
  ]);

  return NextResponse.json({
    event: {
      slug: event.slug,
      title: event.title,
      description: event.description,
      isOpen: event.isOpen,
      allowAnonymous: event.allowAnonymous,
      autoApprove: event.autoApprove,
      autoClusterEnabled: event.autoClusterEnabled,
      createdAt: event.createdAt,
      closesAt: event.closesAt,
    },
    questions,
    groups: groups.map((g) => ({
      id: g.id,
      label: g.label,
      synthesizedQuestion: g.synthesizedQuestion,
      order: g.order,
      questions: g.questions,
    })),
    stats: {
      totalQuestions: questions.length,
      pending: questions.filter((q) => q.status === "PENDING").length,
      approved: questions.filter((q) => q.status === "APPROVED").length,
      answered: questions.filter((q) => q.status === "ANSWERED").length,
      hidden: questions.filter((q) => q.status === "HIDDEN").length,
      voterCount: voterCount.length,
      groupCount: groups.length,
    },
  });
}
