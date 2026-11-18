import 'server-only';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getRedline } from '../data';
import { SortModelOutputSchema, SortResponseSchema } from '../schemas';
import type { ChangeClass, SortResult } from '../types';
import fixtures from '@/data/fixtures/sort_fixtures.json';
import { getClient, isLive, logAiFailure, MODEL_FAST, withTimeout } from './anthropic';

const SYSTEM = `You sort supplier contract changes for a procurement team.
Groups:
- "harmless": wording, address, typo or formatting only. Meaning does not change.
- "legal": liability, indemnity, IP, data protection or governing law.
- "money": renewal or notice, service credits or SLAs, and price or fees.
For money changes, set "line" (renewal | credits | price) and pick the closest "wordingGroup" for the NEW text from this list:
renewal: opt_in, notice_le_30 (auto-renew, 30 days' notice or less), notice_60_90 (auto-renew, 60-90 days' notice)
credits: automatic, claim_le_10 (written claim within 10 days or less), claim_11_30 (claim within 11-30 days), claim_30_autofiled
price: fixed, cap_5, cap_7, open_yearly (supplier may revise fees yearly with no cap)
For harmless and legal changes, line and wordingGroup are null.
confidence is 0 to 1. reason is at most 20 words.
Classify exactly the changes given, one result per change number. Never invent changes.`;

function fixtureResults(redlineId: string): ChangeClass[] {
  const all = fixtures as Record<string, ChangeClass[]>;
  if (!all[redlineId]) throw new Error(`No sort fixture for ${redlineId}`);
  return all[redlineId];
}

function agreesWithExpected(redlineId: string, results: ChangeClass[]): boolean {
  const r = getRedline(redlineId);
  if (results.length !== r.changes.length) return false;
  return r.changes.every((ch) => {
    const got = results.find((x) => x.no === ch.no);
    if (!got || got.group !== ch.expected.group) return false;
    if (ch.expected.group === 'money') return got.line === ch.expected.line && got.wordingGroup === ch.expected.wordingGroup;
    return true;
  });
}

export async function sortRedline(redlineId: string): Promise<SortResult> {
  const r = getRedline(redlineId);
  const cached: SortResult = { results: fixtureResults(redlineId), source: 'cached' };
  if (!isLive()) return cached;

  try {
    const changes = r.changes.map((c) => ({ no: c.no, clause: c.clause, title: c.title, oldText: c.oldText, newText: c.newText }));
    const res = await withTimeout(
      getClient().messages.parse({
        model: MODEL_FAST,
        max_tokens: 2000,
        system: SYSTEM,
        output_config: { effort: 'low', format: zodOutputFormat(SortModelOutputSchema) },
        messages: [
          {
            role: 'user',
            content: `Supplier: ${r.supplier} (${r.supplierType}). Sort these ${changes.length} changes:\n${JSON.stringify(changes, null, 2)}`,
          },
        ],
      }),
    );
    if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error(`No structured output (stop_reason=${res.stop_reason})`);
    const results: ChangeClass[] = res.parsed_output.results.map((x) => ({
      ...x,
      line: x.line ?? undefined,
      wordingGroup: x.wordingGroup ?? undefined,
      confidence: Math.max(0, Math.min(1, x.confidence)),
      reason: x.reason.split(/\s+/).slice(0, 20).join(' '),
    }));
    const parsed = SortResponseSchema.parse({ results, source: 'live' });
    if (!agreesWithExpected(redlineId, parsed.results)) {
      console.warn('[sort] Live result disagrees with the expected script; using the cached fixture.');
      return cached;
    }
    return parsed as SortResult;
  } catch (err) {
    logAiFailure('sort', err);
    return cached;
  }
}
