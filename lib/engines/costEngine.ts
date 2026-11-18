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
// Inputs. Each input follows the same cascade (§6.2): own contracts of the
// same supplier type if there are at least MIN_OWN_N, otherwise a pooled figure
// from 20+ companies, otherwise "not enough history" (NaN).
// ---------------------------------------------------------------------------

export type InputSource = 'own' | 'pooled' | 'assumption' | 'none';
export interface Input {
  value: number;
  n: number; // own contracts (or renewals) behind the value
  source: InputSource;
  pooled?: PooledRate;
}

const TYPE_LABEL: Record<SupplierType, string> = { software: 'software', staffing: 'staffing', logistics: 'logistics', facilities: 'facilities' };

// ---------------------------------------------------------------------------
// Renewal
// ---------------------------------------------------------------------------

function renewalsInGroup(group: RenewalGroup, type: SupplierType = 'software') {
  const ids = new Set(contractsInGroup('renewal', group, type).map((c) => c.id));
  return renewals.filter((r) => ids.has(r.contractId));
}

export function pUnreviewed(group: RenewalGroup, type: SupplierType = 'software'): { p: number; unreviewed: number; total: number } {
  const rs = renewalsInGroup(group, type);
  const unreviewed = rs.filter((r) => !r.reviewed).length;
  return { p: rs.length ? unreviewed / rs.length : 0, unreviewed, total: rs.length };
}

/** Share of renewals with this wording that went through unreviewed. */
export function unreviewedRate(group: RenewalGroup, type: SupplierType = 'software'): Input & { unreviewed: number; total: number } {
  const own = pUnreviewed(group, type);
  const pooled = pooledFor(type, 'renewal', group);
  if (own.total >= MIN_OWN_N) return { value: own.p, n: own.total, source: 'own', pooled, ...own };
  if (pooledUsable(pooled)) return { value: pooled.figure, n: own.total, source: 'pooled', pooled, ...own };
  return { value: NaN, n: own.total, source: 'none', pooled, ...own };
}

/** Mean unused seat share over unreviewed software renewals (0.18). */
export function unusedShare(): { share: number; n: number } {
  const softwareIds = new Set(contracts.filter((c) => c.supplierType === 'software').map((c) => c.id));
  const rs = renewals.filter((r) => softwareIds.has(r.contractId) && !r.reviewed);
  const share = rs.reduce((a, r) => a + (1 - r.seatsUsed / r.seatsPaid), 0) / (rs.length || 1);
  return { share, n: rs.length };
}

/** Overspend on an unreviewed renewal. Measured on software; an assumption for other types. */
export function overspendShare(type: SupplierType): Input {
  const us = unusedShare();
  return { value: us.share, n: us.n, source: type === 'software' ? 'own' : 'assumption' };
}

export function renewalCost(fee: number, group: RenewalGroup, type: SupplierType = 'software'): number {
  if (group === 'opt_in') return 0;
  return unreviewedRate(group, type).value * overspendShare(type).value * fee;
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export interface Recovery {
  recovery: number;
  n: number;
  source: InputSource;
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

export function creditsCost(owedLakh: number, group: CreditsGroup, type: SupplierType = 'software'): number {
  if (group === 'automatic') return 0;
  const r = recovery(group, type);
  const auto = recovery('automatic', type);
  return owedLakh * (auto.recovery - r.recovery);
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

export function meanObservedRise(group: PriceGroup, type: SupplierType = 'software'): { rise: number; n: number } {
  const cs = contractsInGroup('price', group, type);
  if (!cs.length) return { rise: NaN, n: 0 };
  return { rise: cs.reduce((a, c) => a + observedRise(c.id), 0) / cs.length, n: cs.length };
}

/** Average yearly rise for a price wording, by the own → pooled → none cascade. */
export function riseInput(group: 'cap_5' | 'open_yearly', type: SupplierType = 'software'): Input {
  const own = meanObservedRise(group, type);
  const pooled = pooledFor(type, 'price', group);
  if (own.n >= MIN_OWN_N) return { value: own.rise, n: own.n, source: 'own', pooled };
  if (pooledUsable(pooled)) return { value: pooled.figure, n: own.n, source: 'pooled', pooled };
  return { value: NaN, n: own.n, source: 'none', pooled };
}

export function expectedRise(group: PriceGroup, type: SupplierType = 'software'): number {
  switch (group) {
    case 'fixed':
      return 0;
    case 'cap_7':
      // Suppliers price near the cap: scale the observed 5%-cap behaviour up to 7%.
      return 0.07 * (riseInput('cap_5', type).value / 0.05);
    default:
      return riseInput(group, type).value;
  }
}

export function priceCost(fee: number, group: PriceGroup, type: SupplierType = 'software'): number {
  if (group === 'cap_5') return 0;
  return (expectedRise(group, type) - expectedRise('cap_5', type)) * fee;
}

// ---------------------------------------------------------------------------
// Generic cost + price tag
// ---------------------------------------------------------------------------

export const feeLakh = (c: Contract) => c.annualFeeInr / 1e5;

export function cost(c: Contract, line: Line, group: WordingGroup): number {
  const fee = feeLakh(c);
  if (line === 'renewal') return renewalCost(fee, group as RenewalGroup, c.supplierType);
  if (line === 'credits') return creditsCost(creditsOwedLakh(c.id), group as CreditsGroup, c.supplierType);
  return priceCost(fee, group as PriceGroup, c.supplierType);
}

const pct1 = (x: number) => formatPct(x, 1);
const backupOf = (p?: PooledRate) => (p && pooledUsable(p) ? { companies: p.companies, label: p.label } : undefined);

/** Combine input sources: any missing → none; any pooled/assumption → low; all own → by sample size. */
function combine(n: number, ...inputs: InputSource[]): { confidence: Confidence; source: PriceTag['source'] } {
  if (inputs.includes('none')) return { confidence: 'none', source: 'pooled' };
  if (inputs.includes('pooled')) return { confidence: 'low', source: 'pooled' };
  if (inputs.includes('assumption')) return { confidence: 'low', source: 'assumption' };
  return { confidence: confidenceFor(n), source: 'own' };
}

const NOT_ENOUGH = 'Not enough history: fewer than 8 own contracts and no pooled figure from 20+ companies.';

export function priceTag(c: Contract, line: Line, group: WordingGroup): PriceTag {
  const fee = feeLakh(c);
  const type = c.supplierType;
  const costLakh = cost(c, line, group);
  const isBenchmark = BENCHMARK[line] === group;
  const T = TYPE_LABEL[type];

  if (line === 'renewal') {
    const g = group as RenewalGroup;
    const n = contractsInGroup('renewal', g, type).length;
    if (g === 'opt_in') {
      return {
        line, group, costLakh: 0, confidence: 'high', n, source: 'own',
        proof: ['Opt-in is the benchmark: the contract cannot renew without our written yes, so it costs nothing.'],
      };
    }
    const ur = unreviewedRate(g, type);
    const os = overspendShare(type);
    const { confidence, source } = combine(ur.total, ur.source, os.source);
    if (confidence === 'none') return { line, group, costLakh: NaN, confidence, n, source, proof: [NOT_ENOUGH] };
    const proof: string[] = [];
    if (ur.source === 'own') {
      proof.push(`${ur.unreviewed} of ${ur.total} past renewals with this wording (${GROUP_LABEL[g].toLowerCase()}) went through without anyone reviewing them.`);
    } else {
      proof.push(`We have fewer than ${MIN_OWN_N} past ${T} renewals with this wording, so this uses pooled data: ${ur.pooled!.label.toLowerCase()} across ${ur.pooled!.companies} companies.`);
    }
    if (os.source === 'own') {
      proof.push(`Unreviewed renewals left on average ${formatPct(os.value)} of paid seats unused (${os.n} renewals).`);
    } else {
      proof.push(`Assumption: an unreviewed renewal overspends by about ${formatPct(os.value)} of the fee, as measured on our software renewals (${os.n} renewals).`);
    }
    const rate = ur.source === 'own' ? `${ur.unreviewed}/${ur.total}` : formatPct(ur.value);
    proof.push(`${rate} × ${formatPct(os.value)} × ${formatLakh(fee)} fee = ${formatLakh(costLakh)} a year.`);
    return { line, group, costLakh, confidence, n, source, proof, pooledBackup: ur.source === 'pooled' ? backupOf(ur.pooled) : undefined };
  }

  if (line === 'credits') {
    const g = group as CreditsGroup;
    const r = recovery(g, type);
    const auto = recovery('automatic', type);
    const owed = creditsOwedLakh(c.id);
    const pooledBackup = backupOf(r.pooled);
    if (isBenchmark) {
      return {
        line, group, costLakh: 0, confidence: auto.source === 'own' ? confidenceFor(r.n) : 'low', n: r.n, source: auto.source === 'pooled' ? 'pooled' : 'own',
        proof: [
          auto.source === 'own'
            ? `Automatic credits are the benchmark: our ${r.n} contracts with this wording recovered ${formatPct(r.recovery)} of credits owed.`
            : 'Automatic credits are the benchmark: credits arrive on the invoice without anyone claiming them.',
        ],
        pooledBackup,
      };
    }
    const { confidence, source } = combine(r.n, r.source, auto.source);
    if (confidence === 'none') return { line, group, costLakh: NaN, confidence, n: r.n, source, proof: [NOT_ENOUGH] };
    const proof: string[] = [];
    if (r.source === 'own') {
      proof.push(`Our ${r.n} ${T} contracts with a claim window of 10 days or less recovered ${formatPct(r.recovery)} of credits owed.`);
    } else if (r.source === 'pooled') {
      proof.push(`We have ${r.n} own ${type === 'software' ? '' : `${T} `}contracts with this wording, so this uses pooled data: ${r.pooled!.label.toLowerCase()} across ${r.pooled!.companies} companies (recovery ${formatPct(r.recovery)}).`);
    } else {
      proof.push(`Assumption: claims filed automatically by the contract system recover about ${formatPct(r.recovery)} of credits.`);
    }
    proof.push(
      auto.source === 'own'
        ? `Automatic credits recover ${formatPct(auto.recovery)} (${auto.n} contracts).`
        : `Automatic credits recover ${formatPct(auto.recovery)} (pooled: ${auto.pooled!.companies} companies).`,
    );
    proof.push(`${c.supplier} earned ${formatLakh(owed)} in service credits over the last 12 months.`);
    proof.push(`${formatLakh(owed)} × (${formatPct(auto.recovery)} − ${formatPct(r.recovery)}) = ${formatLakh(costLakh)} a year.`);
    return {
      line, group, costLakh, confidence,
      n: r.n,
      source: r.source === 'assumption' ? 'assumption' : source,
      proof,
      pooledBackup: r.source === 'assumption' ? undefined : pooledBackup,
    };
  }

  // price
  const g = group as PriceGroup;
  const base = riseInput('cap_5', type);
  const pooled = pooledFor(type, 'price', g);
  const baseText =
    base.source === 'own'
      ? `${base.n} contracts`
      : base.source === 'pooled'
        ? `pooled: ${base.pooled!.companies} companies`
        : 'not enough history';
  if (g === 'fixed') {
    const n = contractsInGroup('price', 'fixed', type).length;
    if (Number.isNaN(costLakh)) return { line, group, costLakh: 0, confidence: 'high', n, source: 'own', proof: ['A fixed price cannot rise during the term.'] };
    return {
      line, group, costLakh, confidence: base.source === 'own' ? 'high' : 'low', n, source: base.source === 'own' ? 'own' : 'pooled',
      proof: [
        'A fixed price cannot rise during the term.',
        `Compared with the 5% cap benchmark (observed ${pct1(base.value)} a year, ${baseText}), this is ${formatLakh(-costLakh)} a year better.`,
      ],
    };
  }
  if (g === 'cap_5') {
    return {
      line, group, costLakh: 0, confidence: base.source === 'own' ? confidenceFor(base.n) : 'low', n: base.n, source: base.source === 'own' ? 'own' : 'pooled',
      proof: [
        base.source === 'own'
          ? `A 5% cap is the benchmark. Our ${base.n} capped contracts rose ${pct1(base.value)} a year on average.`
          : 'A 5% cap is the benchmark: prices can rise, but never more than 5% a year.',
      ],
    };
  }
  if (g === 'cap_7') {
    const n = contractsInGroup('price', 'cap_7', type).length;
    if (Number.isNaN(costLakh)) return { line, group, costLakh: NaN, confidence: 'none', n, source: 'pooled', proof: [NOT_ENOUGH] };
    return {
      line, group, costLakh, confidence: 'low', n, source: 'assumption',
      proof: [
        `Suppliers price close to the cap: contracts with a 5% cap rose ${pct1(base.value)} (${pct1(base.value / 0.05)} of the cap; ${baseText}).`,
        `Applied to a 7% cap that is an expected rise of ${pct1(expectedRise('cap_7', type))} a year.`,
        `(${pct1(expectedRise('cap_7', type))} − ${pct1(base.value)}) × ${formatLakh(fee)} = ${formatLakh(costLakh)} a year.`,
      ],
      pooledBackup: backupOf(pooled),
    };
  }
  const open = riseInput('open_yearly', type);
  const { confidence, source } = combine(open.n, open.source, base.source);
  const n = contractsInGroup('price', 'open_yearly', type).length;
  if (confidence === 'none') return { line, group, costLakh: NaN, confidence, n, source, proof: [NOT_ENOUGH] };
  return {
    line, group, costLakh, confidence, n, source,
    proof: [
      open.source === 'own'
        ? `Our ${open.n} ${T} contracts with an open yearly revision rose ${pct1(open.value)} on average in year 2.`
        : `We have ${open.n} own ${T} contracts with an open yearly revision, so this uses pooled data: ${open.pooled!.label.toLowerCase()} across ${open.pooled!.companies} companies.`,
      base.source === 'own'
        ? `Contracts with a 5% cap rose ${pct1(base.value)} (${base.n} contracts).`
        : `Contracts with a 5% cap rose ${pct1(base.value)} (${baseText}).`,
      `(${pct1(open.value)} − ${pct1(base.value)}) × ${formatLakh(fee)} fee = ${formatLakh(costLakh)} a year.`,
    ],
    pooledBackup: backupOf(pooled),
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

export function groupContractRows(line: Line, group: WordingGroup, type: SupplierType = 'software'): GroupContractRow[] {
  const cs = contractsInGroup(line, group, type);
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
