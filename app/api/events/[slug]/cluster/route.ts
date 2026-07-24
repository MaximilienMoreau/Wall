import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";
import { clusterEventQuestions } from "@/lib/clustering";
import { checkRateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ slug: string }> };

// Anti-spam : chaque appel a un coût réel (appel API Anthropic facturé), contrairement
// aux autres routes admin qui ne font que lire/écrire en base.
const CLUSTER_RATE_LIMIT_WINDOW_MS = 10_000;

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

  const rate = checkRateLimit(`cluster:${event.id}`, CLUSTER_RATE_LIMIT_WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Merci de patienter avant de relancer le regroupement IA", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
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
