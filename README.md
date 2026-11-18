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

The question the user carries through: **“CloudDesk wants to change our renewal terms. Which changes should I accept, and what should I ask for in return?”**

Each screen has one next-action button in a sticky panel at the top. It says whose turn it is, what they are deciding and what happens next. You can finish the story with that button alone; the demo guide is optional, behind **Walk me through the demo**.

1. **Continue as Riya Kapoor** (stand-in for company single sign-on). The welcome panel says who you are and what you are deciding; beside it, **How this workspace uses data** shows the read-only sources and the admin's two peer-data switches (use: on; contribute: off).
2. **Review CloudDesk’s changes** → **Analyse six changes**: “Three changes could affect what you pay. One needs legal review. Two are routine.” The service-credit change leads, in plain English; the clause text is one click away.
3. **See the financial impact**: accepting all three could cost about ₹13.3 lakh more a year than the current contract (₹11.6 lakh vs procurement benchmarks). The credits card separates the evidence used from the peer comparison.
4. On the credits card, **Try 15 days**: ₹2.4 lakh vs ₹3.2 lakh, from 27 participating companies, confidence low. **Save as my draft counter** → **Review my draft** → **Add it as offer E**.
5. **Compare offers**: commit for three years, pay 15 days sooner, offer more time to claim credits, or your counter. **Send offers for approval**.
6. The panel says it is the business owner's turn, then Finance's. Use **View as business owner** / **View as Finance** to play them.
7. **Preview what CloudDesk will see** → **Send to CloudDesk** → **View as CloudDesk**: pick “Pay faster” and suggest a 7% cap.
8. **Accept** the counter (₹1.1 lakh, inside your ₹1.5 lakh range) → **Send for signature**.
9. **Run the first invoice check**: the signed agreement requires an automatic ₹25,000 credit, the invoice shows ₹0, and Riya is assigned to follow up.

To see the evidence change, switch **Use aggregate peer benchmarks** off: the 15-day estimate becomes “Insufficient data to estimate” (you can still draft it), and SwiftShip's estimates disappear.

### The other five redlines

Every redline in the inbox is interactive, each with its own status, approvals, supplier portal, legal decisions and signature. CloudDesk starts as **New** so the story begins there; the others arrived earlier and start already sorted and priced.

| Supplier | Type | Changes | What it shows |
| --- | --- | --- | --- |
| SwiftShip Logistics | logistics | 1 harmless, 2 money | Thin own history: both price tags come from pooled data and are marked low confidence |
| Nimbus HR Cloud | software | 3 harmless, 1 legal, 1 money | The ask is in the same wording group as today: ₹1.5 lakh exposure vs benchmark, ₹0 vs current. "Hold firm" (no give) ties with the 3-year term and is recommended |
| BrightStaff Services | staffing | 2 harmless, 1 legal, 2 money | Pooled data for staffing; try finance rejecting package A |
| CleanCo Facilities | facilities | 4 harmless, 1 money | Only one trade fits, so "Hold firm" (keep 30 days' notice) is offered next to the 3-year term |
| DataVault | software | 2 legal | No money lines: legal decides both changes, then it signs without packages |

The supplier portal is at `/portal` (pick a supplier) and `/portal/<supplier>`. In cached mode, the assistant answers each redline's suggested questions from the same tools it uses live, so every number still comes from the engines.

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
