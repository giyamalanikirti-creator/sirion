import { getRedline } from './data';
import { buildPackages } from './engines/givegetEngine';
import { redlinePriceTags } from './engines/redline';
import { formatLakh } from './format';

const CLOUDDESK = [
  'Why is the credits line ₹3.2 lakh?',
  'What if we accept a 15-day claim window?',
  'Show packages without the 3-year term',
];

export const lineQuestion = (line: string, costLakh: number) => `Why is the ${line} line ${formatLakh(costLakh)}?`;

/** Suggested questions for a redline. Every one has an answer in cached mode. */
export function suggestedQuestions(redlineId: string): string[] {
  if (redlineId === 'RL-CLOUDDESK') return CLOUDDESK;
  const r = getRedline(redlineId);
  const { tags } = redlinePriceTags(redlineId);
  if (!tags.length) return [`Do any of ${r.supplier}'s changes cost money?`];
  const qs = [...tags]
    .filter((t) => Number.isFinite(t.costLakh))
    .sort((a, b) => b.costLakh - a.costLakh)
    .slice(0, 2)
    .map((t) => lineQuestion(t.line, t.costLakh));
  if (tags.some((t) => t.line === 'credits')) qs.push('What if we accept a 15-day claim window?');
  const pk = buildPackages({ redlineId });
  if (pk.some((p) => p.gives.some((g) => g.id === 'term_3y')) && pk.length > 1) qs.push('Show packages without the 3-year term');
  return qs.slice(0, 3);
}
