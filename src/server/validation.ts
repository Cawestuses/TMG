import { z } from "zod";

export const newsCreateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().min(1).max(50000),
  author: z.string().trim().min(1).max(200),
  date: z.string().datetime().optional(),
}).strict();

export const newsUpdateSchema = newsCreateSchema.partial().strict();

export const staffCreateSchema = z.object({
  nickname: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(200),
  category: z.enum(["private_server", "discord_moderation"]),
  avatarUrl: z.string().trim().max(2000).optional(),
  socialLink: z.string().trim().max(500).optional(),
  order: z.coerce.number().int().min(0).max(10000),
}).strict();

export const staffUpdateSchema = staffCreateSchema.strict();

export const faqCreateSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().min(1).max(10000),
  order: z.coerce.number().int().min(0).max(10000),
}).strict();

export const faqUpdateSchema = faqCreateSchema.strict();

export function stripClientId(body: Record<string, unknown>) {
  const { id: _ignored, ...rest } = body;
  return rest;
}

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    return { success: false, error: message || "Invalid request body" };
  }
  return { success: true, data: result.data };
}
