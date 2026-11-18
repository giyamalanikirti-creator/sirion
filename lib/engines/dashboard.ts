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

/** ₹ at stake per open redline (lakh). CloudDesk comes from the engine; the rest are display-only. */
export function atStakeByRedline(cloudDeskOpen = true) {
  const cd = redlinePriceTags('RL-CLOUDDESK').totalLakh;
  return redlines
    .filter((r) => r.interactive ? cloudDeskOpen : true)
    .map((r) => ({ supplier: r.supplier, short: r.supplier.split(' ')[0], id: r.id, atStake: r.interactive ? cd : r.summary?.atStakeLakh ?? 0 }));
}

/** North-star KPI: money lines enforceable at signing. */
export function northStar(cloudDeskSigned: boolean, cloudDeskEnforceable = 3, cloudDeskLines = 3) {
  const ns = kpiHistory.northStar;
  const enforceable = ns.enforceableBefore + (cloudDeskSigned ? cloudDeskEnforceable : 0);
  const total = ns.totalBefore + (cloudDeskSigned ? cloudDeskLines : 0);
  return { enforceable, total, pct: enforceable / total };
}
