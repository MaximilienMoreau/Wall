import { PrismaClient, type QuestionStatus } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_SLUG = "ai-first";
// Token fixe pour que la démo soit reproductible (ne jamais faire ça pour un vrai événement).
const DEMO_ADMIN_TOKEN = "demo-admin-token-do-not-use-in-prod";

async function main() {
  // Idempotent : si le seed est relancé, on repart d'un état propre.
  const existing = await prisma.event.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    await prisma.event.delete({ where: { id: existing.id } });
  }

  const event = await prisma.event.create({
    data: {
      slug: DEMO_SLUG,
      title: "AI FIRST Meetup",
      description: "Le meetup mensuel sur l'IA générative en entreprise.",
      adminToken: DEMO_ADMIN_TOKEN,
      isOpen: true,
      allowAnonymous: true,
      autoApprove: true,
      autoClusterEnabled: false,
    },
  });

  const groupsData = [
    {
      label: "RGPD & vie privée",
      synthesizedQuestion: "Comment concilier IA générative et conformité RGPD ?",
      order: 0,
    },
    {
      label: "Agents autonomes",
      synthesizedQuestion: "Quelles sont les limites actuelles des agents IA autonomes en production ?",
      order: 1,
    },
    {
      label: "Coûts des API",
      synthesizedQuestion: "Comment maîtriser les coûts d'utilisation des API de modèles de langage ?",
      order: 2,
    },
    {
      label: "RAG",
      synthesizedQuestion: "Quelles bonnes pratiques pour construire un système de RAG fiable ?",
      order: 3,
    },
  ];

  const groups = await Promise.all(
    groupsData.map((g) => prisma.questionGroup.create({ data: { ...g, eventId: event.id } }))
  );

  type SeedQuestion = {
    content: string;
    authorName?: string;
    votes: number;
    status: QuestionStatus;
    groupIndex?: number; // index dans `groups`, absent = non groupé (pour démontrer le clustering en direct)
  };

  const questions: SeedQuestion[] = [
    // RGPD & vie privée
    { content: "Peut-on utiliser ChatGPT sur des données clients sans violer le RGPD ?", authorName: "Claire", votes: 12, status: "APPROVED", groupIndex: 0 },
    { content: "Comment anonymiser les données avant de les envoyer à une API IA externe ?", votes: 9, status: "APPROVED", groupIndex: 0 },
    { content: "Quels risques juridiques si un agent IA génère une réponse biaisée envers un client ?", authorName: "Youssef", votes: 5, status: "APPROVED", groupIndex: 0 },

    // Agents autonomes
    { content: "Un agent autonome peut-il vraiment exécuter une tâche métier de bout en bout sans supervision ?", authorName: "Marc", votes: 15, status: "APPROVED", groupIndex: 1 },
    { content: "Comment éviter qu'un agent IA parte en boucle infinie sur une tâche complexe ?", votes: 7, status: "APPROVED", groupIndex: 1 },
    { content: "Quels frameworks recommandez-vous pour orchestrer plusieurs agents entre eux ?", authorName: "Sophie", votes: 4, status: "ANSWERED", groupIndex: 1 },

    // Coûts des API
    { content: "Quel est le vrai coût mensuel d'une feature IA à l'échelle de 100k utilisateurs ?", votes: 11, status: "APPROVED", groupIndex: 2 },
    { content: "Le cache de prompt (prompt caching) fait-il vraiment baisser la facture ?", authorName: "Antoine", votes: 6, status: "APPROVED", groupIndex: 2 },
    { content: "Faut-il privilégier un petit modèle fine-tuné ou un gros modèle générique côté coûts ?", votes: 3, status: "APPROVED", groupIndex: 2 },

    // RAG
    { content: "Comment évaluer la qualité d'un pipeline RAG en production ?", authorName: "Léa", votes: 8, status: "APPROVED", groupIndex: 3 },
    { content: "Chunking sémantique ou chunking à taille fixe : quel impact réel sur la pertinence ?", votes: 5, status: "APPROVED", groupIndex: 3 },
    { content: "Un RAG bien fait peut-il remplacer un fine-tuning pour de la connaissance métier ?", authorName: "Karim", votes: 2, status: "PENDING", groupIndex: 3 },

    // Non groupées volontairement, pour démontrer le clustering IA en direct pendant la démo
    { content: "L'IA générative va-t-elle vraiment supprimer des emplois de développeur à court terme ?", authorName: "Nadia", votes: 10, status: "APPROVED" },
    { content: "Quelles compétences un développeur doit-il apprendre en priorité face à l'IA ?", votes: 6, status: "APPROVED" },
    { content: "Est-ce que l'IA remplace un vrai code review humain ?", authorName: "Julien", votes: 1, status: "APPROVED" },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: {
        eventId: event.id,
        content: q.content,
        authorName: q.authorName,
        votes: q.votes,
        status: q.status,
        groupId: q.groupIndex !== undefined ? groups[q.groupIndex].id : undefined,
      },
    });
  }

  console.log("\nÉvénement démo créé !\n");
  console.log(`   Page participant : http://localhost:3000/e/${event.slug}`);
  console.log(`   Mode wall        : http://localhost:3000/e/${event.slug}/wall`);
  console.log(`   Admin            : http://localhost:3000/e/${event.slug}/admin?token=${DEMO_ADMIN_TOKEN}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
