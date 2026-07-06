import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAdminToken } from "@/lib/admin-auth";
import { getAdminTokenFromRequest } from "@/lib/admin-request";
import { toCsv, toMarkdown } from "@/lib/export";

type Params = { params: Promise<{ slug: string }> };

// GET /api/events/[slug]/export?format=md|csv : export des données (admin uniquement).
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

  const format = req.nextUrl.searchParams.get("format");
  if (format !== "md" && format !== "csv") {
    return NextResponse.json({ error: "Format invalide (attendu : md ou csv)" }, { status: 400 });
  }

  const [questions, groups] = await Promise.all([
    prisma.question.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } }),
    prisma.questionGroup.findMany({
      where: { eventId: event.id },
      orderBy: { order: "asc" },
      include: { questions: true },
    }),
  ]);

  const body = format === "md" ? toMarkdown(event, questions, groups) : toCsv(questions, groups);
  const contentType = format === "md" ? "text/markdown; charset=utf-8" : "text/csv; charset=utf-8";
  const filename = `wall-${event.slug}.${format}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
