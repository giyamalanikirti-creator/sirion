import { getContract, getRedline, packageTemplates, wordingLibrary } from '../data';
import { LEAD_RANGE_LAKH_PER_LINE } from '../settings';
import type { Counter, FinalDeal, FinalDealLine, Line, PackageId, PackageTemplate, WordingGroup, Wordings } from '../types';
import { cost } from './costEngine';
import { holdFirmTemplate, pricePackage } from './givegetEngine';
import { changedLines, priced, supplierAsk } from './redline';

const FIRST_CHECK: Record<Line, string> = {
  renewal: 'Set on signature',
  credits: 'First invoice after signing',
  price: 'First invoice of contract year 2',
};

/** One alternative a supplier may suggest on a line, from the package's wording. */
const COUNTER_STEP: Partial<Record<WordingGroup, WordingGroup>> = {
  opt_in: 'notice_le_30',
  notice_le_30: 'notice_60_90',
  automatic: 'claim_30_autofiled',
  fixed: 'cap_5',
  cap_5: 'cap_7',
};

/** Counter options a supplier may pick for a package: one step softer on each changed line. */
export function counterOptions(wordings: Wordings, lines: Line[]): Counter[] {
  // Price first: it is the term suppliers most often push back on.
  const order: Line[] = ['price', 'renewal', 'credits'];
  return order.filter((l) => lines.includes(l)).flatMap((l) => {
    const next = COUNTER_STEP[wordings[l]];
    return next ? [{ line: l, group: next }] : [];
  });
}

export function priceCounter(line: Line, currentGroup: WordingGroup, proposedGroup: WordingGroup, redlineId = 'RL-CLOUDDESK') {
  const c = getContract(getRedline(redlineId).contractId);
  const extraLakh = priced(cost(c, line, proposedGroup) - cost(c, line, currentGroup));
  return { extraLakh, insideRange: extraLakh <= LEAD_RANGE_LAKH_PER_LINE, rangeLakh: LEAD_RANGE_LAKH_PER_LINE };
}

export function templateFor(pkgId: PackageId, redlineId = 'RL-CLOUDDESK', extra: PackageTemplate[] = []) {
  const own = extra.find((t) => t.id === pkgId);
  if (own) return own;
  if (pkgId === 'D') {
    const r = getRedline(redlineId);
    return holdFirmTemplate(getContract(r.contractId), supplierAsk(r));
  }
  const t = packageTemplates.find((p) => p.id === pkgId);
  if (!t) throw new Error(`Unknown package ${pkgId}`);
  return t;
}

export function finalDeal(pkgId: PackageId, counters: Counter[] = [], redlineId = 'RL-CLOUDDESK', extra: PackageTemplate[] = []): FinalDeal {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAsk(r, c);
  const lines = changedLines(r);
  const base = pricePackage(c, ask, templateFor(pkgId, redlineId, extra), lines);
  const wordings = { ...base.wordings } as Record<Line, WordingGroup>;
  for (const k of counters) wordings[k.line] = k.group;

  const dealLines: FinalDealLine[] = lines.map((line) => {
    const group = wordings[line];
    const wording = wordingLibrary.find((w) => w.line === line && w.wordingGroup === group);
    if (!wording) throw new Error(`No wording for ${line}/${group}`);
    const residualLakh = priced(cost(c, line, group));
    return {
      line, group, wording, residualLakh,
      protectedLakh: priced(cost(c, line, ask[line]) - cost(c, line, group)),
      enforceable: wording.enforceable,
      sirionCheck: wording.sirionCheck,
      firstCheck: FIRST_CHECK[line],
    };
  });
  const protectedLakh = dealLines.reduce((a, l) => a + l.protectedLakh, 0);
  return {
    packageId: pkgId,
    lines: dealLines,
    protectedLakh,
    giveCostLakh: base.giveCostLakh,
    netLakh: protectedLakh - base.giveCostLakh,
    enforceableCount: dealLines.filter((l) => l.enforceable).length,
    totalLines: dealLines.length,
  };
}
