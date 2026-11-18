import { contracts, kpiHistory, redlines, serviceEvents } from '../data';
import { GROUP_LABEL } from '../format';
import { DEMO_TODAY } from '../settings';
import type { CreditsGroup } from '../types';
import { creditsGroupOf } from './costEngine';
import { redlinePriceTags } from './redline';

const MONTH_FMT = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');

/** Auto-renew notice deadlines (end date − notice days) in each of the next 6 months. */
export function noticeDeadlinesNext6Months(today = DEMO_TODAY) {
  const t = new Date(today);
  const months = Array.from({ length: 6 }, (_, k) => new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1 + k, 1)));
  return months.map((m) => {
    const next = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    const hits = contracts.filter((c) => {
      if (c.renewalWording !== 'auto_renew' || !c.noticeDays) return false;
      const deadline = new Date(new Date(c.endDate).getTime() - c.noticeDays * 86400000);
      return deadline >= m && deadline < next;
    });
    return { month: MONTH_FMT(m), count: hits.length, suppliers: hits.map((c) => c.supplier) };
  });
}

/** Credits owed vs recovered over 12 months, software contracts, by credits wording group (₹ lakh). */
export function creditsByGroup() {
  const groups: CreditsGroup[] = ['automatic', 'claim_le_10'];
  return groups.map((g) => {
    const ids = new Set(contracts.filter((c) => c.supplierType === 'software' && creditsGroupOf(c) === g).map((c) => c.id));
    const ev = serviceEvents.filter((e) => ids.has(e.contractId));
    const owed = ev.reduce((a, e) => a + e.creditOwedInr, 0) / 1e5;
    const recovered = ev.reduce((a, e) => a + e.creditReceivedInr, 0) / 1e5;
    return { group: GROUP_LABEL[g], recovered: +recovered.toFixed(2), lost: +(owed - recovered).toFixed(2), contracts: ids.size };
  });
}

/** Software contracts' credit wording split (donut). */
export function creditWordingSplit() {
  const sw = contracts.filter((c) => c.supplierType === 'software');
  const auto = sw.filter((c) => c.creditWording === 'automatic').length;
  return [
    { name: 'Automatic', value: auto },
    { name: 'Claim-based', value: sw.length - auto },
  ];
}

/** Estimated exposure per redline (lakh), from the engine, for the redlines given. */
export function atStakeByRedline(ids: string[] = redlines.map((r) => r.id)) {
  return redlines
    .filter((r) => ids.includes(r.id))
    .map((r) => ({ supplier: r.supplier, short: r.supplier.split(' ')[0], id: r.id, atStake: redlinePriceTags(r.id).totalLakh }));
}

/** North-star KPI: signed commercial terms with an automated check. Adds the deals signed in this demo to history. */
export function northStar(signed: { enforceable: number; total: number }[] = []) {
  const ns = kpiHistory.northStar;
  const enforceable = ns.enforceableBefore + signed.reduce((a, s) => a + s.enforceable, 0);
  const total = ns.totalBefore + signed.reduce((a, s) => a + s.total, 0);
  return { enforceable, total, pct: enforceable / total };
}
