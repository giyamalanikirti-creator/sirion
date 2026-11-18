import { getContract, getRedline, packageTemplates as defaultTemplates } from '../data';
import type {
  Contract, CreditsGroup, GiveId, Line, PackageTemplate, PriceGroup, PricedPackage, Redline, RenewalGroup,
} from '../types';
import { cost } from './costEngine';
import { giveCost } from './gives';

export const LINES: Line[] = ['renewal', 'credits', 'price'];

export type SupplierAsk = { renewal: RenewalGroup; credits: CreditsGroup; price: PriceGroup };

/** The wording the supplier asked for on each money line, read from the redline. */
export function supplierAskFromRedline(r: Redline): SupplierAsk {
  const ask: Partial<SupplierAsk> = {};
  for (const ch of r.changes) {
    if (ch.expected.group === 'money' && ch.expected.line && ch.expected.wordingGroup) {
      (ask as Record<string, string>)[ch.expected.line] = ch.expected.wordingGroup;
    }
  }
  if (!ask.renewal || !ask.credits || !ask.price) throw new Error(`Redline ${r.id} is missing a money line`);
  return ask as SupplierAsk;
}

export function pricePackage(c: Contract, ask: SupplierAsk, t: PackageTemplate): Omit<PricedPackage, 'rank'> {
  const protectedByLine = {} as Record<Line, number>;
  for (const line of LINES) {
    protectedByLine[line] = cost(c, line, ask[line]) - cost(c, line, t.wordings[line]);
  }
  const gives = t.gives.map((g) => giveCost(c, g));
  const protectedLakh = LINES.reduce((a, l) => a + protectedByLine[l], 0);
  const giveCostLakh = gives.reduce((a, g) => a + g.cashCostLakh, 0);
  const commitmentLakh = gives.reduce((a, g) => a + g.commitmentLakh, 0);
  const approvals: PricedPackage['approvals'] = ['lead'];
  if (gives.some((g) => g.needsFinance)) approvals.push('finance');
  return {
    id: t.id, name: t.name, gives, wordings: t.wordings,
    protectedLakh, protectedByLine, giveCostLakh, commitmentLakh,
    netLakh: protectedLakh - giveCostLakh, approvals,
  };
}

export interface BuildOptions {
  redlineId?: string;
  excludeGives?: GiveId[];
  templates?: PackageTemplate[];
}

/** Price every template, drop those using an excluded give, rank by net. */
export function buildPackages(opts: BuildOptions = {}): PricedPackage[] {
  const r = getRedline(opts.redlineId ?? 'RL-CLOUDDESK');
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  const exclude = new Set(opts.excludeGives ?? []);
  const templates = (opts.templates ?? defaultTemplates).filter((t) => !t.gives.some((g) => exclude.has(g)));
  const priced = templates.map((t) => pricePackage(c, ask, t));
  const ranked = [...priced].sort((a, b) => b.netLakh - a.netLakh);
  return priced.map((p) => ({ ...p, rank: ranked.findIndex((x) => x.id === p.id) + 1 }));
}
