import { z } from 'zod';

export const LineSchema = z.enum(['renewal', 'credits', 'price']);
export const WordingGroupSchema = z.enum([
  'opt_in', 'notice_le_30', 'notice_60_90',
  'automatic', 'claim_le_10', 'claim_11_30', 'claim_30_autofiled',
  'fixed', 'cap_5', 'cap_7', 'open_yearly',
]);
export const GiveIdSchema = z.enum(['term_3y', 'payment_30', 'notice_60', 'claim_30_autofiled']);

// ---- /api/sort ----
export const SortRequestSchema = z.object({ redlineId: z.string().min(1).max(40) });
export const ChangeClassSchema = z.object({
  no: z.number().int(),
  group: z.enum(['harmless', 'legal', 'money']),
  line: LineSchema.nullable().optional(),
  wordingGroup: WordingGroupSchema.nullable().optional(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
});
export const SortResponseSchema = z.object({
  results: z.array(ChangeClassSchema),
  source: z.enum(['live', 'cached']),
});
/** What the model must return (structured output). Nullable instead of optional for strict JSON schema. */
export const SortModelOutputSchema = z.object({
  results: z.array(
    z.object({
      no: z.number().int(),
      group: z.enum(['harmless', 'legal', 'money']),
      line: LineSchema.nullable(),
      wordingGroup: WordingGroupSchema.nullable(),
      confidence: z.number(),
      reason: z.string(),
    }),
  ),
});

// ---- /api/reasons ----
export const ReasonsRequestSchema = z.object({
  wordingOptionIds: z.array(z.string().max(8)).min(1).max(12),
  redlineId: z.string().max(40).optional(),
});
export const ReasonsModelOutputSchema = z.object({
  reasons: z.array(z.object({ id: z.string(), text: z.string() })),
});
export const ReasonsResponseSchema = z.object({
  reasons: z.record(z.string(), z.string()),
  source: z.enum(['live', 'cached']),
});

/** Supplier-facing text must not leak money, internal costs or other customers. */
export function isSupplierSafe(text: string): boolean {
  const t = text.toLowerCase();
  if (/[₹$]|\brs\.?\s?\d|\binr\b|\blakh|\bcrore|\brupee/.test(t)) return false;
  if (/other (customers|clients|suppliers|companies|vendors)|pooled|benchmark|internal cost|our cost/.test(t)) return false;
  return text.trim().split(/\s+/).length <= 30;
}

// ---- /api/ask ----
export const AskMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});
export const AskRequestSchema = z.object({
  messages: z.array(AskMessageSchema).min(1).max(20),
  redlineId: z.string().min(1).max(40),
  role: z.enum(['lead', 'owner', 'finance', 'legal', 'supplier']),
});
export const ChipSchema = z.object({ label: z.string(), kind: z.enum(['data', 'pooled', 'assumption', 'tool']).optional() });
export const AskResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(ChipSchema),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  toolCalls: z.array(z.string()),
  source: z.enum(['live', 'cached']),
});
export type AskResponse = z.infer<typeof AskResponseSchema>;
export type Chip = z.infer<typeof ChipSchema>;

export const ASK_LIMITS = { maxMessages: 8, maxUserChars: 500, maxTokens: 600, maxToolRounds: 4 } as const;
