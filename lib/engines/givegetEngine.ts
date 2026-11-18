import { getContract, getRedline, packageTemplates as defaultTemplates } from '../data';
import type { Contract, GiveId, Line, PackageTemplate, PricedPackage, Redline, WordingGroup, Wordings } from '../types';
import { BENCHMARK, cost } from './costEngine';
import { giveCost } from './gives';
import { changedLines, currentWordings, priced, supplierAsk } from './redline';

export const LINES: Line[] = ['renewal', 'credits', 'price'];

/** Rank by net value; on a tie, the package that commits us to less wins. */
const byNetThenCommitment = (a: PricedPackage | Omit<PricedPackage, 'rank'>, b: PricedPackage | Omit<PricedPackage, 'rank'>) =>
  Math.abs(b.netLakh - a.netLakh) > 0.005 ? b.netLakh - a.netLakh : a.commitmentLakh - b.commitmentLakh;

export type SupplierAsk = Wordings;

/** The wording the supplier asked for on each money line (untouched lines keep today's wording). */
export function supplierAskFromRedline(r: Redline): SupplierAsk {
  return supplierAsk(r);
}

/** Which money line a give trades on (a give on a line the supplier didn't touch means nothing). */
const GIVE_LINE: Partial<Record<GiveId, Line>> = { notice_60: 'renewal', claim_30_autofiled: 'credits' };

function giveApplies(c: Contract, lines: Line[], g: GiveId): boolean {
  if (g === 'payment_30') return c.paymentDays > 30;
  const line = GIVE_LINE[g];
  return !line || lines.includes(line);
}

/**
 * "Hold firm": no give. On each line we keep today's wording where it beats the
 * supplier's ask, and propose the benchmark where today's wording is already weak.
 * Offered only when fewer than two trades remain.
 */
export function holdFirmTemplate(c: Contract, ask: SupplierAsk = currentWordings(c)): PackageTemplate {
  const today = currentWordings(c);
  const w = { ...today } as Record<Line, WordingGroup>;
  for (const l of LINES) {
    const better = priced(cost(c, l, today[l])) < priced(cost(c, l, ask[l])) - 0.005;
    w[l] = better ? today[l] : BENCHMARK[l];
  }
  return { id: 'D', name: 'Hold firm', gives: [], wordings: w as Wordings };
}

/**
 * Price a template against a redline. The template's wording applies only to the
 * lines the supplier changed; gives that make no sense here are dropped.
 */
export function pricePackage(c: Contract, ask: SupplierAsk, t: PackageTemplate, lines: Line[] = LINES): Omit<PricedPackage, 'rank'> {
  const wordings = { ...ask } as Record<Line, WordingGroup>;
  for (const l of lines) wordings[l] = t.wordings[l];
  const protectedByLine = { renewal: 0, credits: 0, price: 0 } as Record<Line, number>;
  for (const l of lines) protectedByLine[l] = priced(cost(c, l, ask[l]) - cost(c, l, wordings[l]));
  const gives = t.gives.filter((g) => giveApplies(c, lines, g)).map((g) => giveCost(c, g));
  const protectedLakh = lines.reduce((a, l) => a + protectedByLine[l], 0);
  const giveCostLakh = gives.reduce((a, g) => a + g.cashCostLakh, 0);
  const commitmentLakh = gives.reduce((a, g) => a + g.commitmentLakh, 0);
  const approvals: PricedPackage['approvals'] = ['lead'];
  if (gives.some((g) => g.needsFinance)) approvals.push('finance');
  return {
    id: t.id, name: t.name, gives, wordings: wordings as Wordings, lines, concession: t.concession,
    protectedLakh, protectedByLine, giveCostLakh, commitmentLakh,
    netLakh: protectedLakh - giveCostLakh, approvals,
  };
}

export interface BuildOptions {
  redlineId?: string;
  excludeGives?: GiveId[];
  templates?: PackageTemplate[];
  /** Offers the lead built herself (e.g. from a saved what-if). Always shown if they protect anything. */
  extra?: PackageTemplate[];
}

/** Price every template, drop those that trade nothing, rank by net. */
export function buildPackages(opts: BuildOptions = {}): PricedPackage[] {
  const r = getRedline(opts.redlineId ?? 'RL-CLOUDDESK');
  const c = getContract(r.contractId);
  const lines = changedLines(r);
  if (!lines.length) return [];
  const ask = supplierAsk(r, c);
  const exclude = new Set(opts.excludeGives ?? []);
  const templates = (opts.templates ?? defaultTemplates).filter((t) => !t.gives.some((g) => exclude.has(g)));
  let priced = templates
    .map((t) => pricePackage(c, ask, t, lines))
    // A trade needs a give and must win something back on the changed lines.
    .filter((p) => p.gives.length > 0 && p.protectedLakh > 0.005);
  if (priced.length < 2) {
    const keep = pricePackage(c, ask, holdFirmTemplate(c, ask), lines);
    if (keep.protectedLakh > 0.005) priced = [...priced, keep];
  }
  for (const t of opts.extra ?? []) {
    const p = pricePackage(c, ask, t, lines);
    if (p.protectedLakh > 0.005) priced = [...priced, p];
  }
  const ranked = [...priced].sort(byNetThenCommitment);
  return priced.map((p) => ({ ...p, rank: ranked.findIndex((x) => x.id === p.id) + 1 }));
}

const CLAIM_DAYS: Partial<Record<WordingGroup, string>> = {
  claim_11_30: '15 days',
  claim_30_autofiled: '30 days, filed automatically',
  claim_le_10: '10 days',
};

/**
 * The lead's own counter from a saved credits what-if: hold firm on the other
 * changed lines, and concede the claim window she tested on credits.
 */
export function draftOfferTemplate(c: Contract, ask: SupplierAsk, credits: WordingGroup): PackageTemplate {
  const base = holdFirmTemplate(c, ask);
  return {
    id: 'E',
    name: 'Your counter',
    gives: [],
    wordings: { ...base.wordings, credits } as Wordings,
    concession: credits === 'automatic' ? undefined : `${CLAIM_DAYS[credits] ?? 'a claim window'} to claim credits, instead of automatic credits`,
  };
}

export interface Preferences {
  /** The buyer must be able to leave at the end of each year (rules out multi-year terms). */
  keepAnnualExit?: boolean;
}

const BREAKS_ANNUAL_EXIT: GiveId[] = ['term_3y'];

export function breaksAnnualExit(p: PricedPackage): boolean {
  return p.gives.some((g) => BREAKS_ANNUAL_EXIT.includes(g.id));
}

/**
 * Recommend a package and explain the trade-off in one sentence.
 * The value of flexibility (annual exit) is not priced, so the comparison
 * always names the commitment rather than hiding it inside "net".
 */
export function recommendPackage(packages: PricedPackage[], prefs: Preferences = {}) {
  const byNet = [...packages].sort(byNetThenCommitment);
  const eligible = byNet.filter((p) => !(prefs.keepAnnualExit && breaksAnnualExit(p)));
  const top = byNet[0];
  const flexible = byNet.find((p) => !breaksAnnualExit(p));
  const recommended = eligible[0] ?? top;
  const tradeOff =
    top && flexible && top.id !== flexible.id && breaksAnnualExit(top)
      ? { committed: top, flexible, netGapLakh: top.netLakh - flexible.netLakh, commitmentLakh: top.commitmentLakh }
      : undefined;
  return { recommended, excluded: byNet.filter((p) => !eligible.includes(p)), tradeOff };
}
