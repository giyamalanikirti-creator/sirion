# Cost of Yes

A Sirion-style prototype for the **negotiation** stage: it prices every money line in a supplier redline before anyone says yes.

CloudDesk (a fictional helpdesk software supplier, ₹60 lakh a year) sends back its renewal with six changes. The app walks that redline from inbox to signature in about three minutes: sort → price tags with proof → give-get packages → approvals → supplier portal and counter → signing, with ₹9.2 lakh a year protected net.

> Concept prototype for a case submission. Not affiliated with or endorsed by Sirion. All suppliers, people and numbers are fictional.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY and set DEMO_MODE=live
npm run dev                  # http://localhost:3000
```

Without a key (or with `DEMO_MODE=cached`) every AI feature uses saved fixtures, and the UI shows "AI: cached". The whole demo works this way.

| Script | What it does |
| --- | --- |
| `npm test` | Vitest: seed targets (§5.3), golden numbers (§6.6), engines, formatting, AI fixtures and guards |
| `npm run seed` | Regenerates `contracts`, `invoices`, `service_events`, `renewals` deterministically (seed 2026) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |

## Demo script (about 3 minutes)

Use the **Demo guide** button (bottom left). Each step has a "Go" link that also switches role. **Reset demo** clears everything.

1. Lead: inbox → CloudDesk (₹11.6 lakh a year at stake)
2. Changes → **Sort changes** (2 harmless logged, 1 to legal, 3 money lines)
3. Price tags: ₹4.5 / ₹3.2 / ₹3.8 lakh with proof; open "See the contracts"
4. Ask: "What if we accept a 15-day claim window?" (₹2.4 lakh, pooled, 27 companies) → Packages → **Send for approval**
5. Business owner approves; finance approves package A (B's give is under the ₹5 lakh limit)
6. Lead: **Send to CloudDesk** → supplier portal: pick B, suggest a 7% cap (no ₹ shown)
7. Lead: accept the counter (₹1.1 lakh, inside the ₹1.5 lakh range)
8. Signing → **Send for signature** (3 of 3 enforceable, ₹9.4 lakh protected, ₹9.2 lakh net; north star 62% → 66%)
9. Insights: predicted vs actual, HelpHub flagged

## How it is built

- **Next.js 16** (App Router, TypeScript), Tailwind v4, Recharts, lucide-react, Radix primitives, Zustand (persisted to localStorage), zod.
- `lib/engines/` — pure, tested engines in lakh: `costEngine` (renewal, credits, price tags with proof and confidence), `gives`, `givegetEngine` (packages, ranking, `excludeGives`), `negotiation` (counter pricing, final deal), `dashboard`.
- `lib/server/` — AI features with `@anthropic-ai/sdk`:
  - **Sorter** (`/api/sort`, `MODEL_FAST`): structured output validated with zod. If the live result disagrees with the expected script, it falls back to the fixture.
  - **Reason writer** (`/api/reasons`, `MODEL_SMART`): supplier-facing sentences; any text mentioning money or other customers is rejected.
  - **Ask panel** (`/api/ask`, `MODEL_SMART`): manual agent loop, at most 4 tool rounds, four read-only tools that run the real engines. Guards: 8 messages, 500 characters, 600 max tokens, supplier role refused, and any ₹ figure not returned by a tool causes a fallback.
- Every AI route sets `maxDuration = 60`, a 20 s per-call timeout, and returns `source: "live" | "cached"`.

### Notes on the spec

- **Structured output instead of forced `tool_choice`.** Current Sonnet models reject forced tool choice, so the sorter and reason writer use `output_config.format` (JSON schema from zod). Same effect: typed, validated output.
- **Contract end dates** span 2 to 18 months (not 6 to 18) so that the "Notice deadlines: next 6 months" chart has data in every month; CloudDesk's renewal is the nearest.
- **Money formatting** drops a trailing ".0" for whole amounts (₹60 lakh, ₹5 lakh).
- **Live mode was not exercised** while building (no key in the build environment). The cached path is fully tested; the live path falls back to it on any error.

## Deploy to Vercel

1. `npm run build` and `npm test` pass; `.env.local` is not committed.
2. Push to GitHub, then in Vercel: **Add New → Project** → import the repo (defaults are fine).
3. Environment variables (Production and Preview): `ANTHROPIC_API_KEY`, `DEMO_MODE` (`live`, or `cached` for zero risk), `MODEL_FAST=claude-haiku-5-5`, `MODEL_SMART=claude-sonnet-5-5`.
4. Deploy, then run the demo script once in each mode and check Vercel → Logs.
