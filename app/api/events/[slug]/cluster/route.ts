import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";
import { clusterEventQuestions } from "@/lib/clustering";

type Params = { params: Promise<{ slug: string }> };

// POST /api/events/[slug]/cluster : déclenche le regroupement IA (admin uniquement).
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const token = getAdminTokenFromRequest(req);
  if (!isValidAdminToken(token, event.adminToken)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée sur le serveur" },
      { status: 503 }
    );
  }

  const result = await clusterEventQuestions(event.id);
  if (!result) {
    return NextResponse.json(
      { error: "Le regroupement IA a échoué, réessaie plus tard" },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}
