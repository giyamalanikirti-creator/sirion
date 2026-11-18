import { describe, expect, it } from 'vitest';
import { getContract } from '@/lib/data';
import { priceTag, recovery, unusedShare, pUnreviewed, expectedRise } from '@/lib/engines/costEngine';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { giveCost } from '@/lib/engines/gives';
import { finalDeal, priceCounter } from '@/lib/engines/negotiation';
import { formatLakh } from '@/lib/format';

const cd = getContract('C-017');

describe('cost engine', () => {
  it('renewal inputs', () => {
    expect(pUnreviewed('notice_60_90')).toMatchObject({ unreviewed: 5, total: 12 });
    expect(pUnreviewed('notice_le_30')).toMatchObject({ unreviewed: 1, total: 10 });
    expect(unusedShare().share).toBeCloseTo(0.18, 6);
  });
  it('recovery sources', () => {
    expect(recovery('automatic').source).toBe('own');
    expect(recovery('claim_le_10')).toMatchObject({ source: 'own', n: 14 });
    expect(recovery('claim_11_30').source).toBe('pooled');
    expect(recovery('claim_30_autofiled')).toMatchObject({ source: 'assumption', recovery: 0.9 });
  });
  it('cap 7% expected rise = 0.0644', () => expect(expectedRise('cap_7')).toBeCloseTo(0.0644, 6));
  it('confidence rules', () => {
    expect(priceTag(cd, 'credits', 'claim_le_10')).toMatchObject({ confidence: 'medium', n: 14, source: 'own' });
    expect(priceTag(cd, 'renewal', 'notice_60_90')).toMatchObject({ confidence: 'medium', n: 12 });
    expect(priceTag(cd, 'price', 'open_yearly')).toMatchObject({ confidence: 'medium', n: 9 });
    expect(priceTag(cd, 'credits', 'claim_le_10').pooledBackup).toEqual({ companies: 31, label: 'About 8 in 10 credits unclaimed' });
  });
  it('fixed price beats the benchmark (negative cost)', () => {
    expect(priceTag(cd, 'price', 'fixed').costLakh).toBeLessThan(0);
    expect(priceTag(cd, 'price', 'fixed').costLakh).toBeCloseTo(-2.76, 3);
  });
  it('every proof sentence is non-empty', () => {
    for (const l of ['renewal', 'credits', 'price'] as const) {
      for (const p of priceTag(cd, l, l === 'renewal' ? 'notice_60_90' : l === 'credits' ? 'claim_le_10' : 'open_yearly').proof) {
        expect(p.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('gives and packages', () => {
  it('finance rules', () => {
    expect(giveCost(cd, 'term_3y').needsFinance).toBe(true);
    expect(giveCost(cd, 'payment_30').needsFinance).toBe(false);
  });
  it('approvals: only A needs finance', () => {
    const pk = buildPackages();
    expect(pk.find((p) => p.id === 'A')!.approvals).toEqual(['lead', 'finance']);
    expect(pk.find((p) => p.id === 'B')!.approvals).toEqual(['lead']);
    expect(pk.find((p) => p.id === 'C')!.approvals).toEqual(['lead']);
  });
  it('ranking by net', () => {
    const pk = buildPackages();
    expect(pk.find((p) => p.id === 'A')!.rank).toBe(1);
    expect(pk.find((p) => p.id === 'B')!.rank).toBe(2);
    expect(pk.find((p) => p.id === 'C')!.rank).toBe(3);
  });
  it('excludeGives drops templates', () => {
    expect(buildPackages({ excludeGives: ['term_3y'] }).map((p) => p.id)).toEqual(['B', 'C']);
  });
});

describe('negotiation', () => {
  it('7% counter is inside the lead range', () => {
    expect(priceCounter('price', 'cap_5', 'cap_7').insideRange).toBe(true);
  });
  it('final deal: 3 of 3 enforceable', () => {
    const d = finalDeal('B', [{ line: 'price', group: 'cap_7' }]);
    expect(d.enforceableCount).toBe(3);
    expect(d.totalLines).toBe(3);
    expect(d.lines.map((l) => l.wording.id)).toEqual(['R2', 'S1', 'P3']);
  });
});

describe('format', () => {
  it('lakh, crore and rupees', () => {
    expect(formatLakh(11.58)).toBe('₹11.6 lakh');
    expect(formatLakh(180)).toBe('₹1.8 crore');
    expect(formatLakh(0.2219)).toBe('₹22,000');
    expect(formatLakh(4.5)).toBe('₹4.5 lakh');
    expect(formatLakh(3.24)).toBe('₹3.2 lakh');
    expect(formatLakh(1.104)).toBe('₹1.1 lakh');
    expect(formatLakh(9.1741)).toBe('₹9.2 lakh');
  });
});

describe('format edge cases', () => {
  it('drops a trailing .0 and handles zero', () => {
    expect(formatLakh(60)).toBe('₹60 lakh');
    expect(formatLakh(5)).toBe('₹5 lakh');
    expect(formatLakh(0)).toBe('₹0');
    expect(formatLakh(1e-15)).toBe('₹0');
    expect(formatLakh(-2.76)).toBe('−₹2.8 lakh');
    expect(formatLakh(0.9)).toBe('₹90,000');
    expect(formatLakh(23.58)).toBe('₹23.6 lakh');
  });
});
