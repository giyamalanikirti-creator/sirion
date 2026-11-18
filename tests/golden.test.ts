import { describe, expect, it } from 'vitest';
import { getContract } from '@/lib/data';
import { cost, priceTag } from '@/lib/engines/costEngine';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { giveCost } from '@/lib/engines/gives';
import { finalDeal, priceCounter } from '@/lib/engines/negotiation';
import { redlinePriceTags } from '@/lib/engines/redline';

const TOL = 0.005;
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOL);
const cd = getContract('C-017');

describe('golden numbers (§6.6)', () => {
  const { tags, totalLakh, pctOfFee } = redlinePriceTags('RL-CLOUDDESK');
  const pk = Object.fromEntries(buildPackages().map((p) => [p.id, p]));

  it('renewal tag (90 days) = 4.5000', () => near(tags[0].costLakh, 4.5));
  it('credits tag (10-day claim) = 3.2400', () => near(tags[1].costLakh, 3.24));
  it('price tag (yearly revision) = 3.8400', () => near(tags[2].costLakh, 3.84));
  it('total at stake = 11.5800 (19.3% of fee)', () => {
    near(totalLakh, 11.58);
    expect(pctOfFee).toBeCloseTo(0.193, 3);
  });
  it('package A protected = 11.5800', () => near(pk.A.protectedLakh, 11.58));
  it('package B protected = 10.5000', () => near(pk.B.protectedLakh, 10.5));
  it('package C protected = 6.9000', () => near(pk.C.protectedLakh, 6.9));
  it('give payment_30 cost = 0.2219', () => near(giveCost(cd, 'payment_30').cashCostLakh, 0.2219));
  it('package A commitment = 180.00', () => near(pk.A.commitmentLakh, 180));
  it('counter 7% vs 5% cap = 1.1040', () => near(priceCounter('price', 'cap_5', 'cap_7').extraLakh, 1.104));
  it('final deal protected (B, cap 7%) = 9.3960', () => near(finalDeal('B', [{ line: 'price', group: 'cap_7' }]).protectedLakh, 9.396));
  it('final deal net = 9.1741', () => near(finalDeal('B', [{ line: 'price', group: 'cap_7' }]).netLakh, 9.1741));
  it('what-if 15-day claim (pooled) = 2.4300', () => {
    const t = priceTag(cd, 'credits', 'claim_11_30');
    near(t.costLakh, 2.43);
    expect(t.source).toBe('pooled');
    expect(t.confidence).toBe('low');
  });
  it('renewal residual at 30 days = 1.0800', () => near(cost(cd, 'renewal', 'notice_le_30'), 1.08));
});
