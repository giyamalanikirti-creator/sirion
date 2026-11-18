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

One story end to end: CloudDesk asks for a 10-day claim window → the buyer sees why ₹3.2 lakh is exposed → tests 15 days → trades faster payment for automatic credits → sees Sirion check the first invoice.

Use the **Demo guide** button (bottom left). Each step has a "Go" link that also switches role. **Reset demo** clears everything.

1. Dashboard → **Review supplier changes** (CloudDesk returned the ₹60 lakh renewal with six edits; nothing is priced yet)
2. **Sort changes**: routine edits fold away, the 10-day claim change rises to the top, 1 change goes to legal
3. Price tags: credits first. Current wording / CloudDesk asks / benchmark used; ₹11.6 lakh a year exposure vs procurement benchmarks (₹13.3 lakh vs the current contract)
4. On the credits card, **Try a different claim window** → 15 days: ₹2.4 lakh vs ₹3.2 lakh (0 own contracts, pooled 11–30 day cohort, 27 companies, low confidence) → **Use as draft counteroffer**
5. Packages: "A nets an estimated ₹1.3 lakh a year more than B and requires a three-year commitment". Tick **Must retain annual exit** to see B recommended → **Send for approval**
6. Business owner approves; finance decides on package A
7. Lead: **Send to CloudDesk** → supplier portal: pick B, suggest a 7% cap (no ₹ shown)
8. Lead: accept the counter (₹1.1 lakh, inside the ₹1.5 lakh range)
9. Signing → **Send for signature** (3 of 3 terms with an automated check; north star 62% → 66%)
10. **Run the first invoice check**: credit expected ₹25,000, found ₹0, dispute owned by the procurement lead

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
