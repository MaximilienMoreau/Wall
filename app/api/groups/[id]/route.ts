import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateGroupSchema } from "@/lib/validation";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/groups/[id] : renommer un thème, éditer sa question synthèse, ou le réordonner (admin).
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const group = await prisma.questionGroup.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, group.event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.questionGroup.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ group: updated });
}

// DELETE /api/groups/[id] : supprime un thème (admin). Les questions qu'il contenait
// sont conservées mais dégroupées (FK onDelete: SetNull), jamais supprimées.
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const group = await prisma.questionGroup.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, group.event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await prisma.questionGroup.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
