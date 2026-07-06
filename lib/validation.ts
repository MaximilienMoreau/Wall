import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit faire au moins 3 caractères").max(120),
  description: z.string().trim().max(500).optional(),
  allowAnonymous: z.boolean().optional(),
  closesAt: z.string().datetime().optional(),
});

export const submitQuestionSchema = z.object({
  content: z.string().trim().min(3, "La question doit faire au moins 3 caractères").max(500),
  authorName: z.string().trim().max(60).optional(),
  fingerprint: z.string().trim().min(8).max(200),
});

export const voteSchema = z.object({
  fingerprint: z.string().trim().min(8).max(200),
});

export const questionStatusEnum = z.enum(["PENDING", "APPROVED", "HIDDEN", "ANSWERED"]);

export const moderateQuestionSchema = z.object({
  status: questionStatusEnum.optional(),
  groupId: z.string().nullable().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isOpen: z.boolean().optional(),
  allowAnonymous: z.boolean().optional(),
  autoApprove: z.boolean().optional(),
  autoClusterEnabled: z.boolean().optional(),
});

export const updateGroupSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  synthesizedQuestion: z.string().trim().min(1).max(500).optional(),
  order: z.number().int().optional(),
});
