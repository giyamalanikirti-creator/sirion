import 'server-only';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { wordingLibrary } from '../data';
import { isSupplierSafe, ReasonsModelOutputSchema } from '../schemas';
import fixture from '@/data/fixtures/reasons_clouddesk.json';
import { getClient, isLive, logAiFailure, MODEL_SMART, withTimeout } from './anthropic';

const SYSTEM = `You write one short, friendly sentence per contract wording, explaining to the supplier (CloudDesk, a helpdesk software company) why the wording is good for both sides.
Rules:
- At most 25 words per sentence.
- Never mention money amounts, currencies, internal costs, savings, benchmarks, other customers, other suppliers or other companies.
- Start from the given plain reason and lightly tailor it to a helpdesk software relationship. Keep the meaning.
Return one entry per id, using the ids given.`;

const FIXTURE = fixture as Record<string, string>;

export function cachedReason(id: string): string {
  return FIXTURE[id] ?? wordingLibrary.find((w) => w.id === id)?.plainReason ?? '';
}

export async function writeReasons(ids: string[]): Promise<{ reasons: Record<string, string>; source: 'live' | 'cached' }> {
  const options = ids.map((id) => wordingLibrary.find((w) => w.id === id)).filter((w) => !!w && w.enforceable);
  const cached = Object.fromEntries(options.map((w) => [w!.id, cachedReason(w!.id)]));
  if (!isLive() || options.length === 0) return { reasons: cached, source: 'cached' };

  try {
    const res = await withTimeout(
      getClient().messages.parse({
        model: MODEL_SMART,
        max_tokens: 1500,
        system: SYSTEM,
        output_config: { effort: 'low', format: zodOutputFormat(ReasonsModelOutputSchema) },
        messages: [
          {
            role: 'user',
            content: JSON.stringify(options.map((w) => ({ id: w!.id, wording: w!.text, plainReason: w!.plainReason }))),
          },
        ],
      }),
    );
    if (res.stop_reason === 'refusal' || !res.parsed_output) throw new Error(`No structured output (stop_reason=${res.stop_reason})`);
    const reasons = { ...cached };
    let anyLive = false;
    for (const r of res.parsed_output.reasons) {
      if (r.id in reasons && isSupplierSafe(r.text)) {
        reasons[r.id] = r.text.trim();
        anyLive = true;
      } else if (r.id in reasons) {
        console.warn(`[reasons] Rejected unsafe or long text for ${r.id}; keeping the library reason.`);
      }
    }
    return { reasons, source: anyLive ? 'live' : 'cached' };
  } catch (err) {
    logAiFailure('reasons', err);
    return { reasons: cached, source: 'cached' };
  }
}
