import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/lib/validation";
import { generateSlug } from "@/lib/slug";
import { generateAdminToken } from "@/lib/admin-auth";

// POST /api/events : création d'un événement. Retourne le slug + l'adminToken
// (affiché une seule fois : le client doit le conserver précieusement).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, allowAnonymous, closesAt } = parsed.data;
  const adminToken = generateAdminToken();

  // Un slug peut théoriquement entrer en collision (suffixe aléatoire) : on retente.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug(title);
    try {
      const event = await prisma.event.create({
        data: {
          slug,
          title,
          description,
          adminToken,
          allowAnonymous: allowAnonymous ?? true,
          closesAt: closesAt ? new Date(closesAt) : undefined,
        },
      });
      return NextResponse.json(
        { slug: event.slug, adminToken, id: event.id },
        { status: 201 }
      );
    } catch (err: unknown) {
      const isUniqueConflict =
        typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (!isUniqueConflict) {
        console.error("Erreur création événement", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
      }
      // sinon on boucle et régénère un slug
    }
  }

  return NextResponse.json(
    { error: "Impossible de générer un slug unique, réessayez" },
    { status: 500 }
  );
}
