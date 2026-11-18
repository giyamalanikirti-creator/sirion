import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import examples from '@/data/fixtures/ask_examples.json';
import reasons from '@/data/fixtures/reasons_clouddesk.json';
import sortFixture from '@/data/fixtures/sort_clouddesk.json';
import { getRedline } from '@/lib/data';
import { priceTag } from '@/lib/engines/costEngine';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { getContract } from '@/lib/data';
import { formatLakh } from '@/lib/format';
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
