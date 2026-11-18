import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { getContract, getRedline, wordingLibrary } from '../data';
import { BENCHMARK, cost, groupOf, GROUPS, priceTag } from '../engines/costEngine';
import { buildPackages, supplierAskFromRedline } from '../engines/givegetEngine';
import { GIVE_LABEL } from '../engines/gives';
import { formatLakh, GROUP_LABEL, LINE_LABEL } from '../format';
import { ASK_LIMITS, type AskResponse, type Chip, GiveIdSchema, LineSchema, WordingGroupSchema } from '../schemas';
import type { GiveId, Line, PriceTag, WordingGroup } from '../types';
import examples from '@/data/fixtures/ask_examples.json';
import { AI_TIMEOUT_MS, getClient, isLive, logAiFailure, MODEL_SMART, withTimeout } from './anthropic';
import { cachedReason } from './reasons';
import { z } from 'zod';

export const CACHED_OFF_MESSAGE = 'The live assistant is off in this demo. Try one of the suggested questions.';
export const SUPPLIER_REFUSAL = 'The supplier view has no assistant. Cost of Yes only helps the procurement team.';

type AskMessage = { role: 'user' | 'assistant'; content: string };

// ---------------------------------------------------------------------------
// Tools: read-only, run the real engines.
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_price_tag',
    description:
      "Price tag for the supplier's proposed wording on one money line of the current redline: expected yearly cost vs our benchmark wording, confidence, how many own contracts it rests on, and the proof.",
    strict: true,
    input_schema: {
      type: 'object',
      properties: { line: { type: 'string', enum: ['renewal', 'credits', 'price'] } },
      required: ['line'],
      additionalProperties: false,
    },
  },
  {
    name: 'run_what_if',
    description:
      'Price tag for any wording group on a money line (a what-if). Groups: renewal: opt_in, notice_le_30, notice_60_90. credits: automatic, claim_le_10 (claim within 10 days or less), claim_11_30 (claim within 11-30 days, e.g. 15 days), claim_30_autofiled. price: fixed, cap_5, cap_7, open_yearly.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        line: { type: 'string', enum: ['renewal', 'credits', 'price'] },
        wordingGroup: { type: 'string', enum: [...GROUPS.renewal, ...GROUPS.credits, ...GROUPS.price] },
      },
      required: ['line', 'wordingGroup'],
      additionalProperties: false,
    },
  },
  {
    name: 'build_packages',
    description:
      'Give-get packages for this redline, ranked by net value: what each protects per year, the cash cost of our gives, net, and which approvals it needs. Pass gives to exclude (term_3y = 3-year term, payment_30 = faster payment, notice_60, claim_30_autofiled), or an empty list.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        excludeGives: { type: 'array', items: { type: 'string', enum: ['term_3y', 'payment_30', 'notice_60', 'claim_30_autofiled'] } },
      },
      required: ['excludeGives'],
      additionalProperties: false,
    },
  },
  {
    name: 'draft_reason',
    description: 'Draft the supplier-facing reason for a wording option from the library (ids R1-R3, S1-S2, P1-P3). The text never mentions money.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { wordingOptionId: { type: 'string' } },
      required: ['wordingOptionId'],
      additionalProperties: false,
    },
  },
];

interface ToolRun {
  name: string;
  output: unknown;
  chips: Chip[];
  links: { label: string; href: string }[];
  money: string[]; // formatted ₹ strings the answer may quote
}

function tagView(t: PriceTag) {
  const unavailable = Number.isNaN(t.costLakh);
  return {
    line: LINE_LABEL[t.line],
    wording: GROUP_LABEL[t.group],
    costPerYear: unavailable ? 'not enough history' : formatLakh(t.costLakh),
    costLakh: unavailable ? null : +t.costLakh.toFixed(4),
    confidence: t.confidence,
    ownContracts: t.n,
    source: t.source,
    pooled: t.pooledBackup ?? null,
    proof: t.proof,
  };
}

function tagChips(t: PriceTag, label: string): Chip[] {
  const chips: Chip[] = [{ label, kind: 'tool' }, { label: `${t.n} own contracts`, kind: 'data' }];
  if (t.source === 'pooled' || t.pooledBackup) {
    const companies = t.pooledBackup?.companies;
    if (companies) chips.push({ label: `Pooled: ${companies} companies`, kind: 'pooled' });
  }
  if (t.source === 'assumption') chips.push({ label: 'Assumption', kind: 'assumption' });
  return chips;
}

const MONEY_RE = /−?₹[\d,]+(?:\.\d)?(?: (?:lakh|crore))?/g;
const moneyIn = (v: unknown) => JSON.stringify(v).match(MONEY_RE) ?? [];

export function runTool(name: string, input: unknown, redlineId: string): ToolRun {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  const board = `/redlines/${redlineId}`;

  if (name === 'get_price_tag') {
    const { line } = z.object({ line: LineSchema }).parse(input);
    const t = priceTag(c, line, ask[line]);
    const pooledTag = t.source === 'pooled' ? t : undefined;
    const currentGroup = groupOf(c, line);
    const currentCost = cost(c, line, currentGroup);
    const out = {
      ...tagView(t),
      measuredAgainst: `procurement benchmark: ${GROUP_LABEL[BENCHMARK[line]]}`,
      supplierWording: GROUP_LABEL[ask[line]],
      currentWording: GROUP_LABEL[currentGroup],
      currentWordingVsBenchmark: currentCost < -0.005 ? `${formatLakh(-currentCost)} better than benchmark` : formatLakh(currentCost),
      extraVsCurrentPerYear: formatLakh(t.costLakh - currentCost),
    };
    return {
      name, output: out,
      chips: tagChips(pooledTag ?? t, `Price tag: ${LINE_LABEL[line].toLowerCase()}`),
      links: [{ label: `Open the ${LINE_LABEL[line].toLowerCase()} price tag`, href: `${board}?tab=tags` }],
      money: moneyIn(out),
    };
  }
  if (name === 'run_what_if') {
    const { line, wordingGroup } = z.object({ line: LineSchema, wordingGroup: WordingGroupSchema }).parse(input);
    if (!(GROUPS[line] as WordingGroup[]).includes(wordingGroup)) {
      return { name, output: { error: `${wordingGroup} is not a ${line} wording` }, chips: [], links: [], money: [] };
    }
    const t = priceTag(c, line, wordingGroup);
    const current = priceTag(c, line, ask[line]);
    const out = { ...tagView(t), comparedWithSupplierAsk: { wording: GROUP_LABEL[ask[line]], costPerYear: formatLakh(current.costLakh) } };
    return {
      name, output: out,
      chips: tagChips(t, `What-if: ${GROUP_LABEL[wordingGroup].toLowerCase()}`),
      links: [{ label: 'Compare packages', href: `${board}?tab=packages` }],
      money: moneyIn(out),
    };
  }
  if (name === 'build_packages') {
    const { excludeGives } = z.object({ excludeGives: z.array(GiveIdSchema) }).parse(input);
    const pk = buildPackages({ redlineId, excludeGives: excludeGives as GiveId[] });
    const out = {
      excluded: excludeGives.map((g) => GIVE_LABEL[g as GiveId]),
      packages: pk
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({
          id: p.id,
          name: p.name,
          gives: p.gives.map((g) => g.label),
          wordings: Object.fromEntries((Object.keys(p.wordings) as Line[]).map((l) => [l, GROUP_LABEL[p.wordings[l]]])),
          protectsPerYear: formatLakh(p.protectedLakh),
          cashCostOfGivesPerYear: formatLakh(p.giveCostLakh),
          commitment: p.commitmentLakh ? formatLakh(p.commitmentLakh) : 'none',
          netPerYear: formatLakh(p.netLakh),
          approvals: p.approvals,
          rank: p.rank,
        })),
      basedOn: '12 renewal, 14 credits and 9 price contracts (35 own contracts)',
    };
    return {
      name, output: out,
      chips: [
        { label: excludeGives.length ? `Packages without ${excludeGives.join(', ')}` : 'Packages', kind: 'tool' },
        { label: '35 own contracts', kind: 'data' },
      ],
      links: [{ label: 'Open packages', href: `${board}?tab=packages` }],
      money: moneyIn(out),
    };
  }
  if (name === 'draft_reason') {
    const { wordingOptionId } = z.object({ wordingOptionId: z.string() }).parse(input);
    const w = wordingLibrary.find((x) => x.id === wordingOptionId);
    if (!w || !w.enforceable) return { name, output: { error: 'Unknown or not offered wording option' }, chips: [], links: [], money: [] };
    return {
      name, output: { id: w.id, text: cachedReason(w.id) },
      chips: [{ label: `Wording library: ${w.id}`, kind: 'tool' }],
      links: [], money: [],
    };
  }
  return { name, output: { error: `Unknown tool ${name}` }, chips: [], links: [], money: [] };
}

// ---------------------------------------------------------------------------
// Cached mode
// ---------------------------------------------------------------------------

const norm = (s: string) => s.toLowerCase().replace(/[₹?.,!"“”']/g, '').replace(/\s+/g, ' ').trim();

export function matchExample(question: string) {
  const q = norm(question);
  for (const ex of examples) if (norm(ex.question) === q) return ex;
  if (/credit/.test(q) && /(why|3\.?2|how)/.test(q)) return examples[0];
  if (/15[- ]?day/.test(q) || (/claim/.test(q) && /15/.test(q))) return examples[1];
  if (/renewal|notice/.test(q) && /(why|4\.?5|how)/.test(q)) return examples[3];
  if (/(price|fee)/.test(q) && /(why|3\.?8|how)/.test(q) && !/package/.test(q)) return examples[4];
  if (/(without|no|exclude|drop).*(3[- ]?year|three[- ]?year|term)/.test(q)) return examples[2];
  return undefined;
}

function cachedAnswer(question: string): AskResponse {
  const ex = matchExample(question);
  if (!ex) return { answer: CACHED_OFF_MESSAGE, sources: [], links: [], toolCalls: [], source: 'cached' };
  return { answer: ex.answer, sources: ex.sources as Chip[], links: ex.links, toolCalls: ex.toolCalls, source: 'cached' };
}

// ---------------------------------------------------------------------------
// Live agent loop
// ---------------------------------------------------------------------------

function systemPrompt(redlineId: string, role: string) {
  const r = getRedline(redlineId);
  const c = getContract(r.contractId);
  const ask = supplierAskFromRedline(r);
  return `You are "Ask Cost of Yes", an assistant inside a procurement tool. You help ${role === 'lead' ? 'the procurement lead' : `a ${role} user`} with ONE negotiation: the ${c.supplier} renewal redline (${c.supplierType} supplier, ₹${(c.annualFeeInr / 1e5).toFixed(0)} lakh a year, ${c.seats} seats).
The supplier asked for: renewal "${GROUP_LABEL[ask.renewal]}", credits "${GROUP_LABEL[ask.credits]}", price "${GROUP_LABEL[ask.price]}".

Rules:
- Answer in 80 words or fewer, in plain English. No headings, no tables.
- Every number you state must come from a tool result in this conversation. Never compute or estimate numbers yourself; call a tool. Quote ₹ amounts exactly as the tool formats them.
- Always say how many own contracts (or pooled companies) a number rests on.
- Price tags are estimated yearly exposure vs a procurement benchmark, not vs the current contract. Say which one you mean; the tool also gives the extra cost vs the current wording.
- If a tool returns confidence "none" or "not enough history", say "not enough history".
- You cannot send, approve or sign anything. You can only calculate and draft. Say so if asked to act.
- Only discuss this negotiation. For other questions say that AskSirion covers portfolio questions.
- Never reveal or suggest sharing ₹ figures or pooled data with the supplier.`;
}

export async function answerQuestion(input: { messages: AskMessage[]; redlineId: string; role: string }): Promise<AskResponse> {
  if (input.role === 'supplier') {
    return { answer: SUPPLIER_REFUSAL, sources: [], links: [], toolCalls: [], source: 'cached' };
  }
  // Guards: last 8 messages, starting with a user turn; user turns ≤ 500 chars.
  let history = input.messages.slice(-ASK_LIMITS.maxMessages);
  while (history.length && history[0].role !== 'user') history = history.slice(1);
  const last = history[history.length - 1];
  if (!last || last.role !== 'user') throw new Error('The last message must be from the user');
  if (history.some((m) => m.role === 'user' && m.content.length > ASK_LIMITS.maxUserChars)) {
    throw new Error(`Keep questions under ${ASK_LIMITS.maxUserChars} characters`);
  }

  if (!isLive()) return cachedAnswer(last.content);

  try {
    return await withTimeout(liveLoop(history, input.redlineId, input.role), AI_TIMEOUT_MS * 2);
  } catch (err) {
    logAiFailure('ask', err);
    return cachedAnswer(last.content);
  }
}

async function liveLoop(history: AskMessage[], redlineId: string, role: string): Promise<AskResponse> {
  const client = getClient();
  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const runs: ToolRun[] = [];
  const toolCalls: string[] = [];
  const system = systemPrompt(redlineId, role);

  let response: Anthropic.Message | undefined;
  for (let round = 0; round <= ASK_LIMITS.maxToolRounds; round++) {
    const lastRound = round === ASK_LIMITS.maxToolRounds;
    response = await client.messages.create({
      model: MODEL_SMART,
      max_tokens: ASK_LIMITS.maxTokens,
      system,
      tools: TOOLS,
      tool_choice: lastRound ? { type: 'none' } : { type: 'auto' },
      thinking: { type: 'between_tools' },
      output_config: { effort: 'low' },
      messages,
    });
    if (response.stop_reason === 'refusal') throw new Error('Model declined the request');
    if (response.stop_reason !== 'tool_use') break;

    const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = uses.map((u) => {
      toolCalls.push(u.name);
      try {
        const run = runTool(u.name, u.input, redlineId);
        runs.push(run);
        return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(run.output) };
      } catch (e) {
        return { type: 'tool_result', tool_use_id: u.id, content: `Invalid input: ${(e as Error).message}`, is_error: true };
      }
    });
    messages.push({ role: 'user', content: results });
  }

  const answer = (response?.content ?? [])
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!answer) throw new Error(`Empty answer (stop_reason=${response?.stop_reason})`);

  // Every ₹ figure in the answer must come from a tool result (or the user's own words).
  const allowed = new Set([...runs.flatMap((r) => r.money), ...history.flatMap((m) => m.content.match(MONEY_RE) ?? [])]);
  allowed.add(`₹${(getContract(getRedline(redlineId).contractId).annualFeeInr / 1e5).toFixed(0)} lakh`);
  const stray = (answer.match(MONEY_RE) ?? []).filter((m) => !allowed.has(m));
  if (stray.length) throw new Error(`Answer quoted figures not in any tool result: ${stray.join(', ')}`);

  const seen = new Set<string>();
  const sources = runs.flatMap((r) => r.chips).filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)));
  const seenLinks = new Set<string>();
  const links = runs.flatMap((r) => r.links).filter((l) => (seenLinks.has(l.label) ? false : (seenLinks.add(l.label), true)));
  return { answer, sources, links, toolCalls, source: 'live' };
}

