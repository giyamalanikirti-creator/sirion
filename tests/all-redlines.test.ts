import { describe, expect, it } from 'vitest';
import { redlines } from '@/lib/data';
import { buildPackages, recommendPackage } from '@/lib/engines/givegetEngine';
import { counterOptions, finalDeal } from '@/lib/engines/negotiation';
import { changedLines, redlinePriceTags } from '@/lib/engines/redline';
import { formatLakh } from '@/lib/format';
import sortFixtures from '@/data/fixtures/sort_fixtures.json';

const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
const fx = sortFixtures as Record<string, { no: number; group: string; line: string | null; wordingGroup: string | null }[]>;

describe('every redline is interactive', () => {
  it('each has clause-level changes, a portal slug and a sort fixture that matches the script', () => {
    for (const r of redlines) {
      expect(r.interactive).toBe(true);
      expect(r.slug).toMatch(/^[a-z]+$/);
      const results = fx[r.id];
      expect(results).toHaveLength(r.changes.length);
      for (const ch of r.changes) {
        const got = results.find((x) => x.no === ch.no)!;
        expect(got.group).toBe(ch.expected.group);
        expect(got.line ?? undefined).toBe(ch.expected.line);
        expect(got.wordingGroup ?? undefined).toBe(ch.expected.wordingGroup);
      }
    }
  });
  it('change mix matches the original inbox summary', () => {
    const mix = (id: string) => {
      const r = redlines.find((x) => x.id === id)!;
      return ['harmless', 'legal', 'money'].map((g) => r.changes.filter((c) => c.expected.group === g).length);
    };
    expect(mix('RL-SWIFTSHIP')).toEqual([1, 0, 2]);
    expect(mix('RL-NIMBUS')).toEqual([3, 1, 1]);
    expect(mix('RL-BRIGHTSTAFF')).toEqual([2, 1, 2]);
    expect(mix('RL-CLEANCO')).toEqual([4, 0, 1]);
    expect(mix('RL-DATAVAULT')).toEqual([0, 2, 0]);
  });
});

describe('price tags beyond software use pooled data and say so', () => {
  it('SwiftShip ≈ ₹5.8 lakh, all low confidence, pooled', () => {
    const t = redlinePriceTags('RL-SWIFTSHIP');
    near(t.totalLakh, 0.35 * 0.18 * 36 + 4.9 * (0.94 - 0.22));
    expect(formatLakh(t.totalLakh)).toBe('₹5.8 lakh');
    expect(t.tags.every((x) => x.confidence === 'low' && x.source === 'pooled')).toBe(true);
  });
  it('Nimbus: same wording group as today, so ₹0 vs current but ₹1.5 lakh vs benchmark', () => {
    const t = redlinePriceTags('RL-NIMBUS');
    near(t.totalLakh, (0.11 - 0.046) * 24);
    near(t.vsCurrentLakh, 0);
    expect(t.tags[0].confidence).toBe('medium');
  });
  it('BrightStaff and CleanCo are priced from pooled rows', () => {
    near(redlinePriceTags('RL-BRIGHTSTAFF').totalLakh, 0.38 * 0.18 * 30 + (0.09 - 0.044) * 30);
    near(redlinePriceTags('RL-CLEANCO').totalLakh, 0.33 * 0.18 * 41);
  });
  it('DataVault has no money lines', () => {
    expect(changedLines(redlines.find((r) => r.id === 'RL-DATAVAULT')!)).toEqual([]);
    expect(redlinePriceTags('RL-DATAVAULT').totalLakh).toBe(0);
    expect(buildPackages({ redlineId: 'RL-DATAVAULT' })).toEqual([]);
  });
});

describe('packages adapt to each redline', () => {
  it('only gives that make sense are offered', () => {
    const nimbus = buildPackages({ redlineId: 'RL-NIMBUS' });
    expect(nimbus.map((p) => p.id).sort()).toEqual(['A', 'D']); // pays in 30 days already; no renewal or credits edit
    expect(recommendPackage(nimbus).recommended.id).toBe('D'); // same net, no commitment
    const bright = buildPackages({ redlineId: 'RL-BRIGHTSTAFF' });
    expect(bright.find((p) => p.id === 'C')!.gives.map((g) => g.id)).toEqual(['notice_60']);
  });
  it('lines the supplier did not change keep today’s wording', () => {
    const sw = buildPackages({ redlineId: 'RL-SWIFTSHIP' });
    for (const p of sw) expect(p.wordings.price).toBe('cap_5'); // today's 5% cap, untouched
    expect(sw.every((p) => p.lines.join() === 'renewal,credits')).toBe(true);
  });
  it('CleanCo falls back to "Hold firm" (keep 30 days, no give)', () => {
    const cc = buildPackages({ redlineId: 'RL-CLEANCO' });
    const d = cc.find((p) => p.id === 'D')!;
    expect(d.name).toBe('Hold firm');
    expect(d.wordings.renewal).toBe('notice_le_30');
    expect(d.gives).toEqual([]);
  });
  it('final deals and counters work for every money redline', () => {
    for (const r of redlines.filter((x) => changedLines(x).length)) {
      for (const p of buildPackages({ redlineId: r.id })) {
        const opts = counterOptions(p.wordings, p.lines);
        const deal = finalDeal(p.id, opts.slice(0, 1), r.id);
        expect(deal.totalLines).toBe(changedLines(r).length);
        expect(deal.enforceableCount).toBe(deal.totalLines);
        expect(Number.isFinite(deal.netLakh)).toBe(true);
      }
    }
  });
  it('CloudDesk is unchanged: B with a 7% cap nets ₹9.2 lakh', () => {
    const opts = counterOptions(buildPackages().find((p) => p.id === 'B')!.wordings, ['renewal', 'credits', 'price']);
    expect(opts).toContainEqual({ line: 'price', group: 'cap_7' });
    near(finalDeal('B', [{ line: 'price', group: 'cap_7' }]).netLakh, 9.1741, 0.005);
  });
});
