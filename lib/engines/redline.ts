import { getContract, getRedline } from '../data';
import type { Contract, Line, PriceTag, Redline, WordingGroup, Wordings } from '../types';
import { BENCHMARK, cost, feeLakh, groupOf, priceTag } from './costEngine';

export const MONEY_LINES: Line[] = ['renewal', 'credits', 'price'];

/** Money lines the supplier changed, in display order. */
export function changedLines(r: Redline): Line[] {
  const set = new Set(r.changes.filter((c) => c.expected.group === 'money' && c.expected.line).map((c) => c.expected.line!));
  return MONEY_LINES.filter((l) => set.has(l));
}

/** Today's wording on every money line. */
export function currentWordings(c: Contract): Wordings {
  return { renewal: groupOf(c, 'renewal'), credits: groupOf(c, 'credits'), price: groupOf(c, 'price') } as Wordings;
}

/** The wording the supplier asks for on each money line; lines it did not touch keep today's wording. */
export function supplierAsk(r: Redline, c: Contract = getContract(r.contractId)): Wordings {
  const ask = { ...currentWordings(c) } as Record<Line, WordingGroup>;
  for (const ch of r.changes) {
    if (ch.expected.group === 'money' && ch.expected.line && ch.expected.wordingGroup) ask[ch.expected.line] = ch.expected.wordingGroup;
  }
  return ask as Wordings;
}

/** A finite cost, or 0 when the line could not be priced (not enough history). */
export const priced = (x: number) => (Number.isFinite(x) ? x : 0);

/**
 * One money line seen three ways. All costs are expected yearly loss vs the
 * line's procurement benchmark (§6.1), so they can be compared directly.
 */
export interface LineComparison {
  line: Line;
  current: { group: WordingGroup; costLakh: number };
  ask: { group: WordingGroup; costLakh: number };
  benchmark: { group: WordingGroup; costLakh: number };
  /** Supplier ask vs the procurement benchmark (the price tag figure). */
  vsBenchmarkLakh: number;
  /** Supplier ask vs the wording in the contract today: the cost of accepting this edit. */
  vsCurrentLakh: number;
}

/** Price tags for the supplier's wording on each money line the redline changes. */
export function redlinePriceTags(redlineId = 'RL-CLOUDDESK') {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAsk(r, c);
  const lines = changedLines(r);
  const tags: PriceTag[] = lines.map((l) => priceTag(c, l, ask[l]));
  const comparisons: LineComparison[] = lines.map((l) => {
    const currentGroup = groupOf(c, l);
    const current = cost(c, l, currentGroup);
    const asked = cost(c, l, ask[l]);
    return {
      line: l,
      current: { group: currentGroup, costLakh: current },
      ask: { group: ask[l], costLakh: asked },
      benchmark: { group: BENCHMARK[l], costLakh: 0 },
      vsBenchmarkLakh: asked,
      vsCurrentLakh: asked - current,
    };
  });
  /** Estimated annual exposure vs procurement benchmarks (the headline). Unpriced lines count as 0 and are listed. */
  const totalLakh = tags.reduce((a, t) => a + priced(t.costLakh), 0);
  /** Estimated annual cost of accepting the redline vs the contract's current terms. */
  const vsCurrentLakh = comparisons.reduce((a, x) => a + priced(x.vsCurrentLakh), 0);
  const unpriced = tags.filter((t) => !Number.isFinite(t.costLakh)).map((t) => t.line);
  return { tags, comparisons, totalLakh, vsCurrentLakh, unpriced, lines, pctOfFee: totalLakh / feeLakh(c), contract: c, redline: r };
}
