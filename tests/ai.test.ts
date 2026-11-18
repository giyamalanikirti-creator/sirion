import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import examples from '@/data/fixtures/ask_examples.json';
import reasons from '@/data/fixtures/reasons_clouddesk.json';
import sortFixtures from '@/data/fixtures/sort_fixtures.json';
const sortFixture = { results: sortFixtures['RL-CLOUDDESK'] };
import { getRedline } from '@/lib/data';
import { priceTag } from '@/lib/engines/costEngine';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { getContract } from '@/lib/data';
import { formatLakh } from '@/lib/format';
import { redlinePriceTags } from '@/lib/engines/redline';
import { AskResponseSchema, isSupplierSafe, SortResponseSchema } from '@/lib/schemas';
import { answerQuestion, CACHED_OFF_MESSAGE, matchExample, runTool, SUPPLIER_REFUSAL } from '@/lib/server/ask';
import { writeReasons } from '@/lib/server/reasons';
import { sortRedline } from '@/lib/server/sorter';

const saved = { ...process.env };
beforeEach(() => {
  process.env.DEMO_MODE = 'cached';
});
afterEach(() => {
  process.env = { ...saved };
});

describe('fixtures', () => {
  it('sort fixture matches the expected script and the zod schema', () => {
    const r = getRedline('RL-CLOUDDESK');
    SortResponseSchema.parse({ ...sortFixture, source: 'cached' });
    for (const ch of r.changes) {
      const got = sortFixture.results.find((x) => x.no === ch.no)!;
      expect(got.group).toBe(ch.expected.group);
      if (ch.expected.line) expect(got.line).toBe(ch.expected.line);
      if (ch.expected.wordingGroup) expect(got.wordingGroup).toBe(ch.expected.wordingGroup);
      expect(got.reason.split(' ').length).toBeLessThanOrEqual(20);
    }
  });
  it('supplier reasons never mention money or other customers', () => {
    for (const t of Object.values(reasons)) expect(isSupplierSafe(t)).toBe(true);
    expect(isSupplierSafe('Saves ₹3 lakh a year')).toBe(false);
    expect(isSupplierSafe('Other customers accepted this')).toBe(false);
  });
  it('ask fixtures quote engine numbers', () => {
    const cd = getContract('C-017');
    for (const ex of examples) AskResponseSchema.parse({ ...ex, source: 'cached' });
    expect(examples[0].answer).toContain(formatLakh(priceTag(cd, 'credits', 'claim_le_10').costLakh));
    expect(examples[1].answer).toContain(formatLakh(priceTag(cd, 'credits', 'claim_11_30').costLakh));
    expect(examples[1].answer).toContain('27 companies');
    const pk = buildPackages({ excludeGives: ['term_3y'] });
    expect(examples[2].answer).toContain(formatLakh(pk[0].protectedLakh));
    expect(examples[2].answer).toContain(formatLakh(pk[1].protectedLakh));
    expect(examples[2].answer).toContain(formatLakh(pk[0].netLakh));
    expect(examples[3].answer).toContain(formatLakh(priceTag(cd, 'renewal', 'notice_60_90').costLakh));
    expect(examples[3].answer).toContain(formatLakh(priceTag(cd, 'renewal', 'notice_le_30').costLakh));
    expect(examples[4].answer).toContain(formatLakh(priceTag(cd, 'price', 'open_yearly').costLakh));
    expect(examples[4].answer).toContain(formatLakh(-priceTag(cd, 'price', 'fixed').costLakh));
    const { comparisons } = redlinePriceTags();
    expect(examples[3].answer).toContain(formatLakh(comparisons[0].vsCurrentLakh));
    expect(examples[4].answer).toContain(formatLakh(comparisons[2].vsCurrentLakh));
  });
});

describe('cached AI routes', () => {
  it('sort falls back to the fixture', async () => {
    const r = await sortRedline('RL-CLOUDDESK');
    expect(r.source).toBe('cached');
    expect(r.results).toHaveLength(6);
  });
  it('reasons fall back to plainReasons', async () => {
    const r = await writeReasons(['R2', 'S1', 'P2', 'S3']);
    expect(r.source).toBe('cached');
    expect(Object.keys(r.reasons)).toEqual(['R2', 'S1', 'P2']); // S3 is not offered
  });
  it('ask answers the three suggested questions', async () => {
    for (const ex of examples) {
      const r = await answerQuestion({ messages: [{ role: 'user', content: ex.question }], redlineId: 'RL-CLOUDDESK', role: 'lead' });
      expect(r.answer).toBe(ex.answer);
    }
    expect(matchExample('what if we accept a 15 day claim?')).toBe(examples[1]);
    expect(matchExample('Why is the renewal line ₹4.5 lakh?')).toBe(examples[3]);
    expect(matchExample('Why is the price line ₹3.8 lakh?')).toBe(examples[4]);
    expect(matchExample('Why is the credits line ₹3.2 lakh?')).toBe(examples[0]);
  });
  it('ask returns the off message for other questions', async () => {
    const r = await answerQuestion({ messages: [{ role: 'user', content: 'What is our biggest contract?' }], redlineId: 'RL-CLOUDDESK', role: 'lead' });
    expect(r.answer).toBe(CACHED_OFF_MESSAGE);
  });
  it('ask refuses the supplier role', async () => {
    const r = await answerQuestion({ messages: [{ role: 'user', content: 'Why is the credits line ₹3.2 lakh?' }], redlineId: 'RL-CLOUDDESK', role: 'supplier' });
    expect(r.answer).toBe(SUPPLIER_REFUSAL);
  });
  it('ask rejects long messages', async () => {
    await expect(
      answerQuestion({ messages: [{ role: 'user', content: 'x'.repeat(501) }], redlineId: 'RL-CLOUDDESK', role: 'lead' }),
    ).rejects.toThrow(/500/);
  });
});

describe('ask tools run the engines', () => {
  it('get_price_tag', () => {
    const r = runTool('get_price_tag', { line: 'credits' }, 'RL-CLOUDDESK');
    expect(r.output).toMatchObject({ costPerYear: '₹3.2 lakh', ownContracts: 14, confidence: 'medium' });
    const price = runTool('get_price_tag', { line: 'price' }, 'RL-CLOUDDESK');
    expect(price.output).toMatchObject({ currentWording: 'Fixed price', currentWordingVsBenchmark: '₹2.8 lakh better than benchmark', extraVsCurrentPerYear: '₹6.6 lakh' });
  });
  it('run_what_if 15-day', () => {
    const r = runTool('run_what_if', { line: 'credits', wordingGroup: 'claim_11_30' }, 'RL-CLOUDDESK');
    expect(r.output).toMatchObject({ costPerYear: '₹2.4 lakh', source: 'pooled', pooled: { companies: 27 } });
    expect(r.chips.map((c) => c.label)).toContain('Pooled: 27 companies');
  });
  it('build_packages without term', () => {
    const r = runTool('build_packages', { excludeGives: ['term_3y'] }, 'RL-CLOUDDESK');
    const out = r.output as { packages: { id: string; protectsPerYear: string }[] };
    expect(out.packages.map((p) => p.id)).toEqual(['B', 'C']);
    expect(out.packages[0].protectsPerYear).toBe('₹10.5 lakh');
  });
  it('rejects a wording group from the wrong line', () => {
    const r = runTool('run_what_if', { line: 'price', wordingGroup: 'automatic' }, 'RL-CLOUDDESK');
    expect(r.output).toHaveProperty('error');
  });
});

describe('cached answers for the other suppliers come from the engines', () => {
  const ask = (q: string, redlineId: string) => answerQuestion({ messages: [{ role: 'user', content: q }], redlineId, role: 'lead' });
  it('every suggested question has a cached answer', async () => {
    const { suggestedQuestions } = await import('@/lib/askSuggestions');
    const { redlines } = await import('@/lib/data');
    for (const r of redlines) {
      for (const q of suggestedQuestions(r.id)) {
        const a = await ask(q, r.id);
        expect(a.answer, `${r.id}: ${q}`).not.toBe(CACHED_OFF_MESSAGE);
      }
    }
  });
  it('SwiftShip credits and what-if quote engine figures', async () => {
    const t = redlinePriceTags('RL-SWIFTSHIP').tags.find((x) => x.line === 'credits')!;
    const a = await ask(`Why is the credits line ${formatLakh(t.costLakh)}?`, 'RL-SWIFTSHIP');
    expect(a.answer).toContain(formatLakh(t.costLakh));
    expect(a.answer).toContain('pooled data from 25 companies');
    const w = await ask('What if we accept a 15-day claim window?', 'RL-SWIFTSHIP');
    expect(w.answer).toContain(formatLakh(priceTag(getContract('C-022'), 'credits', 'claim_11_30').costLakh));
  });
  it('DataVault explains that nothing costs money', async () => {
    const a = await ask("Do any of DataVault's changes cost money?", 'RL-DATAVAULT');
    expect(a.answer).toMatch(/nothing to price/);
  });
});

describe('assistant respects the peer benchmarks setting', () => {
  it('15-day what-if says insufficient internal history when peer benchmarks are off', async () => {
    const a = await answerQuestion({ messages: [{ role: 'user', content: 'What if we accept a 15-day claim window?' }], redlineId: 'RL-CLOUDDESK', role: 'lead', peerBenchmarks: false });
    expect(a.answer).toMatch(/Insufficient internal history to estimate/);
    expect(a.answer).not.toMatch(/27 companies/);
    const on = await answerQuestion({ messages: [{ role: 'user', content: 'What if we accept a 15-day claim window?' }], redlineId: 'RL-CLOUDDESK', role: 'lead', peerBenchmarks: true });
    expect(on.answer).toMatch(/27 companies/);
  });
});
