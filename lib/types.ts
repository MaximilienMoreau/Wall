// Types côté client, reflètent la forme JSON renvoyée par l'API (dates en string).

export type QuestionStatus = "PENDING" | "APPROVED" | "HIDDEN" | "ANSWERED";

export type QuestionDTO = {
  id: string;
  eventId: string;
  content: string;
  authorName: string | null;
  status: QuestionStatus;
  votes: number;
  groupId: string | null;
  createdAt: string;
};

export type QuestionGroupDTO = {
  id: string;
  label: string;
  synthesizedQuestion: string;
  order: number;
  questionCount?: number;
  questions: QuestionDTO[];
};

export type PublicEventDTO = {
  slug: string;
  title: string;
  description: string | null;
  isOpen: boolean;
  allowAnonymous: boolean;
  closesAt: string | null;
};

export type AdminEventDTO = PublicEventDTO & {
  autoApprove: boolean;
  autoClusterEnabled: boolean;
  createdAt: string;
};

export type EventStats = {
  totalQuestions: number;
  pending: number;
  approved: number;
  answered: number;
  hidden: number;
  voterCount: number;
  groupCount: number;
};
