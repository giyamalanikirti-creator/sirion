import { getContract, getRedline } from '../data';
import type { Line, PriceTag } from '../types';
import { feeLakh, priceTag } from './costEngine';
import { supplierAskFromRedline } from './givegetEngine';

/** Price tags for the supplier's wording on each money line of a redline. */
export function redlinePriceTags(redlineId = 'RL-CLOUDDESK') {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  const tags: PriceTag[] = (['renewal', 'credits', 'price'] as Line[]).map((l) => priceTag(c, l, ask[l]));
  const totalLakh = tags.reduce((a, t) => a + t.costLakh, 0);
  return { tags, totalLakh, pctOfFee: totalLakh / feeLakh(c), contract: c };
}
