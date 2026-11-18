import { describe, expect, it } from 'vitest';
import { buildPackages, recommendPackage } from '@/lib/engines/givegetEngine';
import { firstInvoiceCheck } from '@/lib/engines/invoiceCheck';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatLakh } from '@/lib/format';

const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(0.005);

describe('current / ask / benchmark comparison', () => {
  const { comparisons, totalLakh, vsCurrentLakh } = redlinePriceTags();
  const by = Object.fromEntries(comparisons.map((c) => [c.line, c]));

  it('reads current terms from the contract', () => {
    expect(by.renewal.current.group).toBe('notice_le_30');
    expect(by.credits.current.group).toBe('automatic');
    expect(by.price.current.group).toBe('fixed');
  });
  it('benchmarks are opt-in / automatic / 5% cap at zero', () => {
    expect(comparisons.map((c) => c.benchmark.group)).toEqual(['opt_in', 'automatic', 'cap_5']);
  });
  it('per line vs current', () => {
    near(by.renewal.vsCurrentLakh, 3.42); // 4.50 − 1.08
    near(by.credits.vsCurrentLakh, 3.24); // 3.24 − 0
    near(by.price.vsCurrentLakh, 6.6); // 3.84 − (−2.76)
  });
  it('headline vs benchmark stays 11.58; vs current is 13.26', () => {
    near(totalLakh, 11.58);
    near(vsCurrentLakh, 13.26);
    expect(formatLakh(vsCurrentLakh)).toBe('₹13.3 lakh');
  });
});

describe('package recommendation', () => {
  const pk = buildPackages();
  it('without preferences, A leads B by ₹1.3 lakh net and the commitment is named', () => {
    const r = recommendPackage(pk);
    expect(r.recommended.id).toBe('A');
    expect(r.tradeOff!.committed.id).toBe('A');
    expect(r.tradeOff!.flexible.id).toBe('B');
    near(r.tradeOff!.netGapLakh, 1.3021);
    expect(formatLakh(r.tradeOff!.netGapLakh)).toBe('₹1.3 lakh');
    expect(formatLakh(r.tradeOff!.commitmentLakh)).toBe('₹1.8 crore');
  });
  it('"must retain annual exit" switches the recommendation to B', () => {
    const r = recommendPackage(pk, { keepAnnualExit: true });
    expect(r.recommended.id).toBe('B');
    expect(r.excluded.map((p) => p.id)).toEqual(['A']);
  });
});

describe('first invoice check (simulated)', () => {
  it('expects ₹25,000, finds ₹0, flags the gap', () => {
    const c = firstInvoiceCheck();
    expect(c.monthlyFeeInr).toBe(500_000);
    expect(c.steps).toBe(1);
    expect(c.expectedInr).toBe(25_000);
    expect(c.foundInr).toBe(0);
    expect(c.gapInr).toBe(25_000);
    expect(c.status).toBe('discrepancy');
    expect(c.clause.id).toBe('S1');
  });
});
