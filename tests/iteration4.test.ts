import { afterEach, describe, expect, it } from 'vitest';
import { getContract } from '@/lib/data';
import { priceTag, setPeerBenchmarks } from '@/lib/engines/costEngine';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatLakh } from '@/lib/format';
import { dealFor, offersFor } from '@/lib/offers';

afterEach(() => setPeerBenchmarks(true));
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(0.005);
const cd = getContract('C-017');

describe('peer benchmarks switch', () => {
  it('CloudDesk numbers rest on own data, so they do not change', () => {
    setPeerBenchmarks(false);
    near(redlinePriceTags().totalLakh, 11.58);
    near(redlinePriceTags().vsCurrentLakh, 13.26);
    expect(priceTag(cd, 'credits', 'claim_le_10').pooledBackup).toBeUndefined();
  });
  it('the 15-day what-if needs peer data: insufficient data when it is off', () => {
    near(priceTag(cd, 'credits', 'claim_11_30').costLakh, 2.43);
    setPeerBenchmarks(false);
    const t = priceTag(cd, 'credits', 'claim_11_30');
    expect(Number.isNaN(t.costLakh)).toBe(true);
    expect(t.confidence).toBe('none');
  });
  it('SwiftShip cannot be priced without peer data', () => {
    setPeerBenchmarks(false);
    const t = redlinePriceTags('RL-SWIFTSHIP');
    expect(t.unpriced).toEqual(['renewal', 'credits']);
    expect(t.totalLakh).toBe(0);
  });
});

describe("Riya's 15-day counter as an offer", () => {
  const n = { creditDraft: 'claim_11_30' as const, draftInOffers: true };
  it('is offer E: hold firm on renewal and price, 15 days on credits', () => {
    const e = offersFor('RL-CLOUDDESK', n).find((p) => p.id === 'E')!;
    expect(e.wordings).toEqual({ renewal: 'notice_le_30', credits: 'claim_11_30', price: 'fixed' });
    expect(e.concession).toMatch(/15 days to claim credits/);
    // protects 3.42 (renewal) + 0.81 (credits: 3.24 − 2.43) + 6.6 (price) vs CloudDesk's redline
    near(e.protectedLakh, 3.42 + (3.24 - 2.43) + 6.6);
    expect(formatLakh(e.protectedByLine.credits)).toBe('₹81,000');
  });
  it('is not offered until added, and signs like any other offer', () => {
    expect(offersFor('RL-CLOUDDESK', { creditDraft: 'claim_11_30' }).some((p) => p.id === 'E')).toBe(false);
    const d = dealFor('RL-CLOUDDESK', { ...n, supplierPick: 'E' });
    // A 15-day manual claim still relies on someone remembering: no automated check on that line.
    expect(d.enforceableCount).toBe(2);
    const credits = d.lines.find((l) => l.line === 'credits')!;
    expect(credits.wording.id).toBe('S4');
    expect(credits.enforceable).toBe(false);
  });
});
