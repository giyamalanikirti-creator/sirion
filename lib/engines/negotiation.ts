import { getContract, getRedline, packageTemplates, wordingLibrary } from '../data';
import { LEAD_RANGE_LAKH_PER_LINE } from '../settings';
import type { Counter, FinalDeal, FinalDealLine, Line, PackageId, WordingGroup } from '../types';
import { cost } from './costEngine';
import { LINES, pricePackage, supplierAskFromRedline } from './givegetEngine';

const FIRST_CHECK: Record<Line, string> = {
  renewal: 'Set on signature',
  credits: 'First invoice after signing',
  price: 'First invoice of contract year 2',
};

export function priceCounter(line: Line, currentGroup: WordingGroup, proposedGroup: WordingGroup, redlineId = 'RL-CLOUDDESK') {
  const c = getContract(getRedline(redlineId).contractId);
  const extraLakh = cost(c, line, proposedGroup) - cost(c, line, currentGroup);
  return { extraLakh, insideRange: extraLakh <= LEAD_RANGE_LAKH_PER_LINE, rangeLakh: LEAD_RANGE_LAKH_PER_LINE };
}

export function finalDeal(pkgId: PackageId, counters: Counter[] = [], redlineId = 'RL-CLOUDDESK'): FinalDeal {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  const t = packageTemplates.find((p) => p.id === pkgId);
  if (!t) throw new Error(`Unknown package ${pkgId}`);
  const wordings = { ...t.wordings } as Record<Line, WordingGroup>;
  for (const k of counters) wordings[k.line] = k.group;
  const base = pricePackage(c, ask, t);

  const lines: FinalDealLine[] = LINES.map((line) => {
    const group = wordings[line];
    const wording = wordingLibrary.find((w) => w.line === line && w.wordingGroup === group);
    if (!wording) throw new Error(`No wording for ${line}/${group}`);
    const residualLakh = cost(c, line, group);
    return {
      line, group, wording, residualLakh,
      protectedLakh: cost(c, line, ask[line]) - residualLakh,
      enforceable: wording.enforceable,
      sirionCheck: wording.sirionCheck,
      firstCheck: FIRST_CHECK[line],
    };
  });
  const protectedLakh = lines.reduce((a, l) => a + l.protectedLakh, 0);
  return {
    packageId: pkgId,
    lines,
    protectedLakh,
    giveCostLakh: base.giveCostLakh,
    netLakh: protectedLakh - base.giveCostLakh,
    enforceableCount: lines.filter((l) => l.enforceable).length,
    totalLines: lines.length,
  };
}
