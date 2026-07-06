import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Tu regroupes des questions posées lors d'un événement (meetup/conférence) en thèmes.

Règles impératives :
- Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après, sans balises markdown.
- Conserve les groupes existants quand ils restent pertinents (renseigne leur "existingGroupId").
- Ne fusionne deux questions dans un même groupe que si elles partagent une vraie similarité sémantique (même sujet de fond), pas juste des mots en commun.
- Une question qui n'a de similarité forte avec aucune autre reste seule et va dans "ungrouped".
- Les labels de thème sont en français, 2 à 5 mots, concis.
- La "synthesizedQuestion" reformule fidèlement le sujet commun du groupe, sans inventer d'information absente des questions d'origine.
- Chaque id de question fourni en entrée doit apparaître exactement une fois au total, soit dans "questionIds" d'un groupe, soit dans "ungrouped".

Schéma de réponse strict :
{
  "groups": [
    {
      "existingGroupId": "string | null",
      "label": "Thème en 2-5 mots",
      "synthesizedQuestion": "Une question claire qui synthétise le groupe",
      "questionIds": ["id1", "id2"]
    }
  ],
  "ungrouped": ["id3"]
}`;

type ClusterQuestion = { id: string; content: string };
type ExistingGroup = { id: string; label: string; synthesizedQuestion: string };

type ClusterResult = {
  groups: {
    existingGroupId: string | null;
    label: string;
    synthesizedQuestion: string;
    questionIds: string[];
  }[];
  ungrouped: string[];
};

function buildUserContent(questions: ClusterQuestion[], existingGroups: ExistingGroup[]): string {
  return JSON.stringify({ questions, existingGroups }, null, 2);
}

/** Retire les éventuelles balises ```json ... ``` autour de la réponse du modèle. */
function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isValidClusterResult(value: unknown): value is ClusterResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.groups) || !Array.isArray(v.ungrouped)) return false;
  return v.groups.every(
    (g) =>
      g &&
      typeof g === "object" &&
      ("existingGroupId" in g ? typeof g.existingGroupId === "string" || g.existingGroupId === null : true) &&
      typeof (g as Record<string, unknown>).label === "string" &&
      typeof (g as Record<string, unknown>).synthesizedQuestion === "string" &&
      Array.isArray((g as Record<string, unknown>).questionIds)
  );
}

async function callModel(client: Anthropic, userContent: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: userContent }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

/**
 * Regroupe par IA les questions approuvées d'un événement.
 * Défensif par construction : en cas de réponse IA invalide (même après un retry),
 * on abandonne silencieusement : les questions restent non groupées, jamais de crash.
 */
export async function clusterEventQuestions(eventId: string): Promise<{ groupCount: number } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY manquante : clustering IA désactivé");
    return null;
  }

  const [questions, existingGroups] = await Promise.all([
    prisma.question.findMany({
      where: { eventId, status: { in: ["APPROVED", "ANSWERED"] } },
      select: { id: true, content: true },
    }),
    prisma.questionGroup.findMany({
      where: { eventId },
      select: { id: true, label: true, synthesizedQuestion: true, order: true },
    }),
  ]);

  if (questions.length === 0) return { groupCount: 0 };

  const client = new Anthropic({ apiKey });
  const userContent = buildUserContent(
    questions,
    existingGroups.map(({ id, label, synthesizedQuestion }) => ({ id, label, synthesizedQuestion }))
  );

  let parsed: ClusterResult | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callModel(client, userContent);
      const candidate = JSON.parse(stripCodeFences(raw));
      if (isValidClusterResult(candidate)) {
        parsed = candidate;
        break;
      }
      console.error("Réponse de clustering IA hors schéma, tentative", attempt + 1);
    } catch (err) {
      console.error("Échec du parsing JSON du clustering IA, tentative", attempt + 1, err);
    }
  }

  if (!parsed) {
    console.error("Clustering IA abandonné après 2 tentatives, questions laissées non groupées");
    return null;
  }

  const knownIds = new Set(questions.map((q) => q.id));
  const existingGroupIds = new Set(existingGroups.map((g) => g.id));
  let nextOrder = existingGroups.reduce((max, g) => Math.max(max, g.order), -1) + 1;

  await prisma.$transaction(async (tx) => {
    for (const group of parsed!.groups) {
      const questionIds = group.questionIds.filter((id) => knownIds.has(id));
      if (questionIds.length === 0) continue;

      const useExisting = group.existingGroupId && existingGroupIds.has(group.existingGroupId);
      const groupId = useExisting
        ? group.existingGroupId!
        : (
            await tx.questionGroup.create({
              data: {
                eventId,
                label: group.label,
                synthesizedQuestion: group.synthesizedQuestion,
                order: nextOrder++,
              },
            })
          ).id;

      if (useExisting) {
        await tx.questionGroup.update({
          where: { id: groupId },
          data: { label: group.label, synthesizedQuestion: group.synthesizedQuestion },
        });
      }

      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: { groupId },
      });
    }

    const ungroupedIds = parsed!.ungrouped.filter((id) => knownIds.has(id));
    if (ungroupedIds.length > 0) {
      await tx.question.updateMany({
        where: { id: { in: ungroupedIds } },
        data: { groupId: null },
      });
    }

    // Nettoyage : supprime les groupes devenus vides (dissous par l'IA).
    const emptyGroups = await tx.questionGroup.findMany({
      where: { eventId, questions: { none: {} } },
      select: { id: true },
    });
    if (emptyGroups.length > 0) {
      await tx.questionGroup.deleteMany({ where: { id: { in: emptyGroups.map((g) => g.id) } } });
    }
  });

  const groupCount = await prisma.questionGroup.count({ where: { eventId } });
  return { groupCount };
}
