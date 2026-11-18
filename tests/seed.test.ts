import { describe, expect, it } from 'vitest';
import { contracts, invoices, pooledRates, renewals, serviceEvents, redlines, wordingLibrary, packageTemplates } from '@/lib/data';
import { creditsGroupOf, observedRise, priceGroupOf, renewalGroupOf } from '@/lib/engines/costEngine';
import { noticeDeadlinesNext6Months } from '@/lib/engines/dashboard';

const sw = contracts.filter((c) => c.supplierType === 'software');
const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

describe('seed: shape', () => {
  it('has 40 contracts with the right type mix', () => {
    expect(contracts).toHaveLength(40);
    expect(sw).toHaveLength(25);
    expect(count(contracts, (c) => c.supplierType === 'staffing')).toBe(6);
    expect(count(contracts, (c) => c.supplierType === 'logistics')).toBe(5);
    expect(count(contracts, (c) => c.supplierType === 'facilities')).toBe(4);
  });
  it('has 960 invoice lines, 300 service events, 22 renewals', () => {
    expect(invoices).toHaveLength(960);
    expect(serviceEvents).toHaveLength(300);
    expect(renewals).toHaveLength(22);
  });
  it('has the hand-written files', () => {
    expect(wordingLibrary).toHaveLength(10);
    expect(redlines).toHaveLength(6);
    expect(packageTemplates).toHaveLength(3);
    expect(pooledRates.length).toBeGreaterThanOrEqual(12);
  });
});

describe('seed: software groups (§5.3)', () => {
  it('renewal groups 12 / 10 / 3', () => {
    expect(count(sw, (c) => renewalGroupOf(c) === 'notice_60_90')).toBe(12);
    expect(count(sw, (c) => renewalGroupOf(c) === 'notice_le_30')).toBe(10);
    expect(count(sw, (c) => renewalGroupOf(c) === 'opt_in')).toBe(3);
    for (const c of sw) {
      if (renewalGroupOf(c) === 'notice_60_90') expect([60, 90]).toContain(c.noticeDays);
      if (renewalGroupOf(c) === 'notice_le_30') expect([15, 30]).toContain(c.noticeDays);
    }
  });
  it('credits groups 14 claim (5/7/10 days) / 11 automatic', () => {
    expect(count(sw, (c) => creditsGroupOf(c) === 'claim_le_10')).toBe(14);
    expect(count(sw, (c) => creditsGroupOf(c) === 'automatic')).toBe(11);
    for (const c of sw.filter((x) => x.creditWording === 'claim_based')) expect([5, 7, 10]).toContain(c.claimWindowDays);
  });
  it('price groups 9 open / 10 cap 5% / 6 fixed', () => {
    expect(count(sw, (c) => priceGroupOf(c) === 'open_yearly')).toBe(9);
    expect(count(sw, (c) => priceGroupOf(c) === 'cap_5')).toBe(10);
    expect(count(sw, (c) => priceGroupOf(c) === 'fixed')).toBe(6);
  });
});

describe('seed: named contracts', () => {
  it('CloudDesk C-017', () => {
    const c = contracts.find((x) => x.id === 'C-017')!;
    expect(c).toMatchObject({
      supplier: 'CloudDesk', supplierType: 'software', seats: 500, annualFeeInr: 6_000_000,
      renewalWording: 'auto_renew', noticeDays: 30, creditWording: 'automatic', priceWording: 'fixed', paymentDays: 45,
    });
  });
  it('Nimbus HR Cloud C-004', () => {
    const c = contracts.find((x) => x.id === 'C-004')!;
    expect(c).toMatchObject({
      supplier: 'Nimbus HR Cloud', supplierType: 'software', noticeDays: 90, claimWindowDays: 10,
      priceWording: 'open_yearly', annualFeeInr: 2_400_000, paymentDays: 30,
    });
  });
  it('SwiftShip Logistics C-022', () => {
    const c = contracts.find((x) => x.id === 'C-022')!;
    expect(c).toMatchObject({
      supplier: 'SwiftShip Logistics', supplierType: 'logistics', renewalWording: 'opt_in', claimWindowDays: 15,
      priceWording: 'capped', priceCapPct: 5, annualFeeInr: 3_600_000, paymentDays: 45,
    });
  });
  it('includes the other named suppliers', () => {
    const names = contracts.map((c) => `${c.supplier}|${c.supplierType}`);
    expect(names.some((n) => n.startsWith('BrightStaff Services|staffing'))).toBe(true);
    expect(names.some((n) => n.startsWith('CleanCo Facilities|facilities'))).toBe(true);
    for (const n of ['DataVault', 'CloudOps Suite', 'HelpHub']) expect(names).toContain(`${n}|software`);
  });
});

describe('seed: renewals', () => {
  const byGroup = (g: string) => renewals.filter((r) => renewalGroupOf(contracts.find((c) => c.id === r.contractId)!) === g);
  it('5 of 12 unreviewed in 60–90; 1 of 10 in ≤30; none opt-in', () => {
    expect(byGroup('notice_60_90')).toHaveLength(12);
    expect(byGroup('notice_60_90').filter((r) => !r.reviewed)).toHaveLength(5);
    expect(byGroup('notice_le_30')).toHaveLength(10);
    expect(byGroup('notice_le_30').filter((r) => !r.reviewed)).toHaveLength(1);
    expect(byGroup('opt_in')).toHaveLength(0);
  });
  it('unused shares of unreviewed renewals: mean exactly 0.18', () => {
    const shares = renewals.filter((r) => !r.reviewed).map((r) => 1 - r.seatsUsed / r.seatsPaid);
    const s60 = byGroup('notice_60_90').filter((r) => !r.reviewed).map((r) => +(1 - r.seatsUsed / r.seatsPaid).toFixed(4)).sort();
    expect(s60).toEqual([0.12, 0.15, 0.18, 0.21, 0.24]);
    const s30 = byGroup('notice_le_30').filter((r) => !r.reviewed).map((r) => +(1 - r.seatsUsed / r.seatsPaid).toFixed(4));
    expect(s30).toEqual([0.18]);
    expect(shares.reduce((a, b) => a + b, 0) / shares.length).toBeCloseTo(0.18, 10);
  });
});

describe('seed: credits and prices', () => {
  const ratio = (g: string) => {
    const ids = new Set(sw.filter((c) => creditsGroupOf(c) === g).map((c) => c.id));
    const ev = serviceEvents.filter((e) => ids.has(e.contractId));
    return ev.reduce((a, e) => a + e.creditReceivedInr, 0) / ev.reduce((a, e) => a + e.creditOwedInr, 0);
  };
  it('recovery 0.22 for claim ≤10 and 0.94 for automatic', () => {
    expect(Math.abs(ratio('claim_le_10') - 0.22)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(ratio('automatic') - 0.94)).toBeLessThanOrEqual(0.001);
  });
  it('received never exceeds owed', () => {
    for (const e of serviceEvents) {
      expect(e.creditReceivedInr).toBeGreaterThanOrEqual(0);
      expect(e.creditReceivedInr).toBeLessThanOrEqual(e.creditOwedInr);
    }
  });
  it('CloudDesk owed ₹4,50,000 over 12 months', () => {
    const ev = serviceEvents.filter((e) => e.contractId === 'C-017');
    expect(ev).toHaveLength(12);
    expect(ev.reduce((a, e) => a + e.creditOwedInr, 0)).toBe(450_000);
  });
  it('mean price rises: open 0.11, cap 5% 0.046, fixed 0', () => {
    const mean = (g: string) => {
      const cs = sw.filter((c) => priceGroupOf(c) === g);
      return cs.reduce((a, c) => a + observedRise(c.id), 0) / cs.length;
    };
    expect(mean('open_yearly')).toBeCloseTo(0.11, 6);
    expect(mean('cap_5')).toBeCloseTo(0.046, 6);
    expect(mean('fixed')).toBe(0);
    const open = sw.filter((c) => priceGroupOf(c) === 'open_yearly').map((c) => +observedRise(c.id).toFixed(4)).sort();
    expect(open).toEqual([0.08, 0.09, 0.1, 0.11, 0.11, 0.12, 0.12, 0.13, 0.13]);
  });
});

describe('seed: pooled rates (§5.4)', () => {
  it('has the two fixed rows', () => {
    expect(pooledRates).toContainEqual({ supplierType: 'software', line: 'credits', wordingGroup: 'claim_le_10', companies: 31, figure: 0.8, label: 'About 8 in 10 credits unclaimed' });
    expect(pooledRates).toContainEqual({ supplierType: 'software', line: 'credits', wordingGroup: 'claim_11_30', companies: 27, figure: 0.6, label: 'About 6 in 10 credits unclaimed' });
  });
  it('exactly one row under 20 companies', () => {
    expect(pooledRates.filter((p) => p.companies < 20)).toHaveLength(1);
    expect(pooledRates.find((p) => p.companies < 20)!.companies).toBe(14);
  });
});

describe('seed: dates', () => {
  it('notice deadlines land in each of the next 6 months', () => {
    const months = noticeDeadlinesNext6Months();
    expect(months).toHaveLength(6);
    for (const m of months) expect(m.count).toBeGreaterThan(0);
  });
});
