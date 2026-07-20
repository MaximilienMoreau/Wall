import { PrismaClient } from "@prisma/client";

// `fingerprint` sert uniquement au rate-limiting anti-spam côté serveur (cf. schema.prisma) :
// omis par défaut de toute lecture pour qu'aucune route ne puisse l'exposer par mégarde.
function createPrismaClient() {
  return new PrismaClient({
    omit: { question: { fingerprint: true } },
  });
}

// Évite de recréer un client à chaque hot-reload en dev (Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
