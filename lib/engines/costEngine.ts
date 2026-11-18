import { contracts, invoices, pooledRates, renewals, serviceEvents } from '../data';
import { formatLakh, formatPct, GROUP_LABEL } from '../format';
import { AUTOFILED_RECOVERY, MIN_OWN_N, MIN_POOLED_COMPANIES } from '../settings';
import type {
  Confidence, Contract, CreditsGroup, Line, PooledRate, PriceGroup, PriceTag, RenewalGroup, SupplierType, WordingGroup,
} from '../types';

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

export const BENCHMARK: { renewal: RenewalGroup; credits: CreditsGroup; price: PriceGroup } = {
  renewal: 'opt_in',
  credits: 'automatic',
  price: 'cap_5',
};

export const GROUPS: Record<Line, WordingGroup[]> = {
  renewal: ['opt_in', 'notice_le_30', 'notice_60_90'],
  credits: ['automatic', 'claim_le_10', 'claim_11_30', 'claim_30_autofiled'],
  price: ['fixed', 'cap_5', 'cap_7', 'open_yearly'],
};

export function renewalGroupOf(c: Contract): RenewalGroup {
  if (c.renewalWording === 'opt_in') return 'opt_in';
  return (c.noticeDays ?? 0) <= 30 ? 'notice_le_30' : 'notice_60_90';
}
export function creditsGroupOf(c: Contract): CreditsGroup {
  if (c.creditWording === 'automatic') return 'automatic';
  return (c.claimWindowDays ?? 0) <= 10 ? 'claim_le_10' : 'claim_11_30';
}
export function priceGroupOf(c: Contract): PriceGroup {
  if (c.priceWording === 'fixed') return 'fixed';
  if (c.priceWording === 'open_yearly') return 'open_yearly';
  return (c.priceCapPct ?? 5) <= 5 ? 'cap_5' : 'cap_7';
}
export function groupOf(c: Contract, line: Line): WordingGroup {
  return line === 'renewal' ? renewalGroupOf(c) : line === 'credits' ? creditsGroupOf(c) : priceGroupOf(c);
}

/** Own contracts of a supplier type whose wording falls into a group. */
export function contractsInGroup(line: Line, group: WordingGroup, type: SupplierType = 'software'): Contract[] {
  return contracts.filter((c) => c.supplierType === type && groupOf(c, line) === group);
}

export function pooledFor(type: SupplierType, line: Line, group: WordingGroup): PooledRate | undefined {
  return pooledRates.find((p) => p.supplierType === type && p.line === line && p.wordingGroup === group);
}
export const pooledUsable = (p?: PooledRate): p is PooledRate => !!p && p.companies >= MIN_POOLED_COMPANIES;

function confidenceFor(n: number): Confidence {
  if (n >= 20) return 'high';
  if (n >= MIN_OWN_N) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Renewal
// ---------------------------------------------------------------------------

function renewalsInGroup(group: RenewalGroup, type: SupplierType = 'software') {
  const ids = new Set(contractsInGroup('renewal', group, type).map((c) => c.id));
  return renewals.filter((r) => ids.has(r.contractId));
}

export function pUnreviewed(group: RenewalGroup): { p: number; unreviewed: number; total: number } {
  const rs = renewalsInGroup(group);
  const unreviewed = rs.filter((r) => !r.reviewed).length;
  return { p: rs.length ? unreviewed / rs.length : 0, unreviewed, total: rs.length };
}

/** Mean unused seat share over unreviewed software renewals (0.18). */
export function unusedShare(): { share: number; n: number } {
  const softwareIds = new Set(contracts.filter((c) => c.supplierType === 'software').map((c) => c.id));
  const rs = renewals.filter((r) => softwareIds.has(r.contractId) && !r.reviewed);
  const share = rs.reduce((a, r) => a + (1 - r.seatsUsed / r.seatsPaid), 0) / (rs.length || 1);
  return { share, n: rs.length };
}

export function renewalCost(fee: number, group: RenewalGroup): number {
  if (group === 'opt_in') return 0;
  return pUnreviewed(group).p * unusedShare().share * fee;
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface Recovery {
  recovery: number;
  n: number;
  source: 'own' | 'pooled' | 'assumption' | 'none';
  pooled?: PooledRate;
}

export function recovery(group: CreditsGroup, type: SupplierType = 'software'): Recovery {
  const own = contractsInGroup('credits', group, type);
  const pooled = pooledFor(type, 'credits', group);
  if (group === 'claim_30_autofiled') {
    return { recovery: AUTOFILED_RECOVERY, n: own.length, source: 'assumption', pooled };
  }
  if (own.length >= MIN_OWN_N) {
    const ids = new Set(own.map((c) => c.id));
    const ev = serviceEvents.filter((e) => ids.has(e.contractId));
    const owed = ev.reduce((a, e) => a + e.creditOwedInr, 0);
    const got = ev.reduce((a, e) => a + e.creditReceivedInr, 0);
    return { recovery: owed ? got / owed : 0, n: own.length, source: 'own', pooled };
  }
  if (pooledUsable(pooled)) return { recovery: 1 - pooled.figure, n: own.length, source: 'pooled', pooled };
  return { recovery: NaN, n: own.length, source: 'none', pooled };
}

/** Credits owed over the contract's last 12 months, in lakh. */
export function creditsOwedLakh(contractId: string): number {
  const ev = serviceEvents.filter((e) => e.contractId === contractId).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  return ev.reduce((a, e) => a + e.creditOwedInr, 0) / 1e5;
}

export function creditsCost(owedLakh: number, group: CreditsGroup): number {
  const r = recovery(group);
  if (Number.isNaN(r.recovery)) return NaN;
  return owedLakh * (recovery('automatic').recovery - r.recovery);
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

/** Year-2 vs year-1 invoiced unit price rise for one contract. */
export function observedRise(contractId: string): number {
  const lines = invoices.filter((i) => i.contractId === contractId).sort((a, b) => a.date.localeCompare(b.date));
  const y1 = lines.slice(0, 12);
  const y2 = lines.slice(12, 24);
  const mean = (xs: typeof lines) => xs.reduce((a, l) => a + l.invoicedUnitPriceInr, 0) / (xs.length || 1);
  return mean(y2) / mean(y1) - 1;
}

export function meanObservedRise(group: PriceGroup): { rise: number; n: number } {
  const cs = contractsInGroup('price', group);
  if (!cs.length) return { rise: NaN, n: 0 };
  return { rise: cs.reduce((a, c) => a + observedRise(c.id), 0) / cs.length, n: cs.length };
}

export function expectedRise(group: PriceGroup): number {
  switch (group) {
    case 'fixed':
      return 0;
    case 'cap_7':
      // Suppliers price near the cap: scale the observed 5%-cap behaviour up to 7%.
      return 0.07 * (meanObservedRise('cap_5').rise / 0.05);
    default:
      return meanObservedRise(group).rise;
  }
}

export function priceCost(fee: number, group: PriceGroup): number {
  return (expectedRise(group) - expectedRise('cap_5')) * fee;
}

// ---------------------------------------------------------------------------
// Generic cost + price tag
// ---------------------------------------------------------------------------

export const feeLakh = (c: Contract) => c.annualFeeInr / 1e5;

export function cost(c: Contract, line: Line, group: WordingGroup): number {
  const fee = feeLakh(c);
  if (line === 'renewal') return renewalCost(fee, group as RenewalGroup);
  if (line === 'credits') return creditsCost(creditsOwedLakh(c.id), group as CreditsGroup);
  return priceCost(fee, group as PriceGroup);
}

const pct1 = (x: number) => formatPct(x, 1);

export function priceTag(c: Contract, line: Line, group: WordingGroup): PriceTag {
  const fee = feeLakh(c);
  const costLakh = cost(c, line, group);
  const isBenchmark = BENCHMARK[line] === group;

  if (line === 'renewal') {
    const g = group as RenewalGroup;
    const n = contractsInGroup('renewal', g).length;
    if (g === 'opt_in') {
      return {
        line, group, costLakh: 0, confidence: 'high', n, source: 'own',
        proof: ['Opt-in is the benchmark: the contract cannot renew without our written yes, so it costs nothing.'],
      };
    }
    const pu = pUnreviewed(g);
    const us = unusedShare();
    return {
      line, group, costLakh, confidence: confidenceFor(n), n, source: 'own',
      proof: [
        `${pu.unreviewed} of ${pu.total} past renewals with this wording (${GROUP_LABEL[g].toLowerCase()}) went through without anyone reviewing them.`,
        `Unreviewed renewals left on average ${formatPct(us.share)} of paid seats unused (${us.n} renewals).`,
        `${pu.unreviewed}/${pu.total} × ${formatPct(us.share)} × ${formatLakh(fee)} fee = ${formatLakh(costLakh)} a year.`,
      ],
    };
  }

  if (line === 'credits') {
    const g = group as CreditsGroup;
    const r = recovery(g);
    const auto = recovery('automatic');
    const owed = creditsOwedLakh(c.id);
    const pooledBackup = r.pooled ? { companies: r.pooled.companies, label: r.pooled.label } : undefined;
    if (isBenchmark) {
      return {
        line, group, costLakh: 0, confidence: confidenceFor(r.n), n: r.n, source: 'own',
        proof: [
          `Automatic credits are the benchmark: our ${r.n} contracts with this wording recovered ${formatPct(r.recovery)} of credits owed.`,
        ],
        pooledBackup,
      };
    }
    if (r.source === 'none') {
      return {
        line, group, costLakh: NaN, confidence: 'none', n: r.n, source: 'pooled',
        proof: ['Not enough history: fewer than 8 own contracts and no pooled figure from 20+ companies.'],
      };
    }
    const proof: string[] = [];
    if (r.source === 'own') {
      proof.push(`Our ${r.n} software contracts with a claim window of 10 days or less recovered ${formatPct(r.recovery)} of credits owed.`);
    } else if (r.source === 'pooled') {
      proof.push(`We have ${r.n} own contracts with this wording, so this uses pooled data: ${r.pooled!.label.toLowerCase()} across ${r.pooled!.companies} companies (recovery ${formatPct(r.recovery)}).`);
    } else {
      proof.push(`Assumption: claims filed automatically by the contract system recover about ${formatPct(r.recovery)} of credits.`);
    }
    proof.push(`Automatic credits recover ${formatPct(auto.recovery)} (${auto.n} contracts).`);
    proof.push(`${c.supplier} earned ${formatLakh(owed)} in service credits over the last 12 months.`);
    proof.push(`${formatLakh(owed)} × (${formatPct(auto.recovery)} − ${formatPct(r.recovery)}) = ${formatLakh(costLakh)} a year.`);
    return {
      line, group, costLakh,
      confidence: r.source === 'own' ? confidenceFor(r.n) : 'low',
      n: r.n,
      source: r.source,
      proof,
      pooledBackup: r.source === 'own' ? pooledBackup : undefined,
    };
  }

  // price
  const g = group as PriceGroup;
  const base = meanObservedRise('cap_5');
  const pooled = pooledFor('software', 'price', g);
  if (g === 'fixed') {
    const n = contractsInGroup('price', 'fixed').length;
    return {
      line, group, costLakh, confidence: 'high', n, source: 'own',
      proof: [
        'A fixed price cannot rise during the term.',
        `Compared with the 5% cap benchmark (observed ${pct1(base.rise)} a year, ${base.n} contracts), this is ${formatLakh(-costLakh)} a year better.`,
      ],
    };
  }
  if (g === 'cap_5') {
    return {
      line, group, costLakh: 0, confidence: confidenceFor(base.n), n: base.n, source: 'own',
      proof: [`A 5% cap is the benchmark. Our ${base.n} capped contracts rose ${pct1(base.rise)} a year on average.`],
    };
  }
  if (g === 'cap_7') {
    const n = contractsInGroup('price', 'cap_7').length;
    return {
      line, group, costLakh, confidence: 'low', n, source: 'assumption',
      proof: [
        `Suppliers price close to the cap: our ${base.n} contracts with a 5% cap rose ${pct1(base.rise)} (${pct1(base.rise / 0.05)} of the cap).`,
        `Applied to a 7% cap that is an expected rise of ${pct1(expectedRise('cap_7'))} a year.`,
        `(${pct1(expectedRise('cap_7'))} − ${pct1(base.rise)}) × ${formatLakh(fee)} = ${formatLakh(costLakh)} a year.`,
      ],
      pooledBackup: pooled ? { companies: pooled.companies, label: pooled.label } : undefined,
    };
  }
  const open = meanObservedRise('open_yearly');
  return {
    line, group, costLakh, confidence: confidenceFor(open.n), n: open.n, source: 'own',
    proof: [
      `Our ${open.n} software contracts with an open yearly revision rose ${pct1(open.rise)} on average in year 2.`,
      `Contracts with a 5% cap rose ${pct1(base.rise)} (${base.n} contracts).`,
      `(${pct1(open.rise)} − ${pct1(base.rise)}) × ${formatLakh(fee)} fee = ${formatLakh(costLakh)} a year.`,
    ],
    pooledBackup: pooled ? { companies: pooled.companies, label: pooled.label } : undefined,
  };
}

// ---------------------------------------------------------------------------
// "See the contracts" drawer
// ---------------------------------------------------------------------------

export interface GroupContractRow {
  id: string;
  supplier: string;
  wording: string;
  outcome: string;
  bad: boolean;
}

export function groupContractRows(line: Line, group: WordingGroup): GroupContractRow[] {
  const cs = contractsInGroup(line, group);
  return cs.map((c) => {
    if (line === 'renewal') {
      const r = renewals.find((x) => x.contractId === c.id);
      const unused = r ? 1 - r.seatsUsed / r.seatsPaid : 0;
      return {
        id: c.id, supplier: c.supplier,
        wording: c.noticeDays ? `${c.noticeDays} days' notice` : 'Opt-in',
        outcome: !r ? 'No past renewal' : r.reviewed ? `Reviewed · ${formatPct(unused)} seats unused` : `Not reviewed · ${formatPct(unused)} seats unused`,
        bad: !!r && !r.reviewed,
      };
    }
    if (line === 'credits') {
      const ev = serviceEvents.filter((e) => e.contractId === c.id);
      const owed = ev.reduce((a, e) => a + e.creditOwedInr, 0);
      const got = ev.reduce((a, e) => a + e.creditReceivedInr, 0);
      const rate = owed ? got / owed : 1;
      return {
        id: c.id, supplier: c.supplier,
        wording: c.claimWindowDays ? `${c.claimWindowDays}-day claim` : 'Automatic',
        outcome: owed ? `${formatLakh(got / 1e5)} of ${formatLakh(owed / 1e5)} recovered (${formatPct(rate)})` : 'No credits owed',
        bad: rate < 0.5,
      };
    }
    const rise = observedRise(c.id);
    return {
      id: c.id, supplier: c.supplier,
      wording: c.priceWording === 'capped' ? `${c.priceCapPct}% cap` : c.priceWording === 'fixed' ? 'Fixed' : 'Open yearly',
      outcome: `Year-2 rise ${formatPct(rise, 1)}`,
      bad: rise > 0.07,
    };
  });
}
