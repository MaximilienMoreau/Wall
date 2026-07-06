import type { Event, Question, QuestionGroup } from "@prisma/client";

type ExportGroup = QuestionGroup & { questions: Question[] };

const STATUS_LABEL: Record<Question["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  HIDDEN: "Masquée",
  ANSWERED: "Répondue",
};

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Export CSV : une table questions (avec leur groupe) suivie d'une table groupes. */
export function toCsv(questions: Question[], groups: ExportGroup[]): string {
  const groupLabelById = new Map(groups.map((g) => [g.id, g.label]));

  const questionRows = [
    ["id", "content", "authorName", "status", "votes", "group", "createdAt"],
    ...questions.map((q) => [
      q.id,
      q.content,
      q.authorName ?? "",
      STATUS_LABEL[q.status],
      String(q.votes),
      q.groupId ? (groupLabelById.get(q.groupId) ?? "") : "",
      q.createdAt.toISOString(),
    ]),
  ];

  const groupRows = [
    ["id", "label", "synthesizedQuestion", "questionCount", "order"],
    ...groups.map((g) => [g.id, g.label, g.synthesizedQuestion, String(g.questions.length), String(g.order)]),
  ];

  const renderTable = (rows: string[][]) =>
    rows.map((row) => row.map(csvEscape).join(",")).join("\n");

  return `${renderTable(questionRows)}\n\n${renderTable(groupRows)}\n`;
}

/** Export Markdown : lisible, pensé pour être partagé après l'événement. */
export function toMarkdown(event: Event, questions: Question[], groups: ExportGroup[]): string {
  const lines: string[] = [];
  lines.push(`# ${event.title}`);
  if (event.description) lines.push(`\n${event.description}`);
  lines.push(`\n_Exporté le ${new Date().toLocaleString("fr-FR")}_\n`);

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  if (sortedGroups.length > 0) {
    lines.push("## Thèmes\n");
    for (const group of sortedGroups) {
      lines.push(`### ${group.label} (${group.questions.length} question(s))`);
      lines.push(`> ${group.synthesizedQuestion}\n`);
      for (const q of group.questions) {
        lines.push(`- ${q.content} (*${q.authorName || "Anonyme"}*, ▲ ${q.votes}, ${STATUS_LABEL[q.status]})`);
      }
      lines.push("");
    }
  }

  const ungrouped = questions.filter((q) => !q.groupId);
  const sortedAll = [...questions].sort((a, b) => b.votes - a.votes);

  if (ungrouped.length > 0) {
    lines.push("## Questions non groupées\n");
    for (const q of ungrouped.sort((a, b) => b.votes - a.votes)) {
      lines.push(`- ${q.content} (*${q.authorName || "Anonyme"}*, ▲ ${q.votes}, ${STATUS_LABEL[q.status]})`);
    }
    lines.push("");
  }

  lines.push("## Toutes les questions (triées par votes)\n");
  for (const q of sortedAll) {
    lines.push(`- [${STATUS_LABEL[q.status]}] ${q.content} (*${q.authorName || "Anonyme"}*, ▲ ${q.votes})`);
  }

  return lines.join("\n") + "\n";
}
