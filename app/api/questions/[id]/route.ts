import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderateQuestionSchema } from "@/lib/validation";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/questions/[id] : modération (statut) et/ou changement de groupe (admin uniquement).
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, question.event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = moderateQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, groupId } = parsed.data;

  if (groupId) {
    const group = await prisma.questionGroup.findUnique({ where: { id: groupId } });
    if (!group || group.eventId !== question.eventId) {
      return NextResponse.json({ error: "Groupe introuvable pour cet événement" }, { status: 400 });
    }
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
    },
  });

  return NextResponse.json({ question: updated });
}
