import { getContract, getRedline } from '../data';
import type { Line, PriceTag, WordingGroup } from '../types';
import { BENCHMARK, cost, feeLakh, groupOf, priceTag } from './costEngine';
import { supplierAskFromRedline } from './givegetEngine';

export const MONEY_LINES: Line[] = ['renewal', 'credits', 'price'];

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

/** Price tags for the supplier's wording on each money line of a redline. */
export function redlinePriceTags(redlineId = 'RL-CLOUDDESK') {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  const tags: PriceTag[] = MONEY_LINES.map((l) => priceTag(c, l, ask[l]));
  const comparisons: LineComparison[] = MONEY_LINES.map((l) => {
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
  /** Estimated annual exposure vs procurement benchmarks (the headline). */
  const totalLakh = tags.reduce((a, t) => a + t.costLakh, 0);
  /** Estimated annual cost of accepting the redline vs the contract's current terms. */
  const vsCurrentLakh = comparisons.reduce((a, x) => a + x.vsCurrentLakh, 0);
  return { tags, comparisons, totalLakh, vsCurrentLakh, pctOfFee: totalLakh / feeLakh(c), contract: c };
}
