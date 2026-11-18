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

Each negotiation screen has one progress indicator (which is also how you move between stages) and one status strip saying whose turn it is, what they are deciding and what happens next, with the single primary action. The walkthrough is optional, under **Help → Walk me through the demo**.

1. **Continue as Riya Kapoor** (stand-in for company SSO). The Overview opens on the active task, **Review CloudDesk’s renewal**, with the scenario in three sentences and **Review the 6 changes**.
2. **Analyse 6 changes**: three affect what you pay, one needs legal review, two are routine. Each change states its practical effect above two aligned document columns (blue: current signed contract; amber: CloudDesk’s proposal).
3. **Financial impact**: “Accepting all three changes could cost an estimated ₹13.3 lakh more per year than your current contract” (₹11.6 lakh vs benchmarks as the secondary comparison). One row per clause; **Evidence** opens a drawer.
4. **Explore alternatives**: starts on CloudDesk’s 10-day proposal. **15 days** → ₹2.4 lakh, from an 11–30 day cohort of 27 participating companies, low confidence → **Save to draft offer** → **View my draft** → **Add to comparison as offer E**.
5. **Compare offers**: a table aligning what we give, what we get, annual value, the ₹1.8 crore commitment, approvals and automated checks. **We must keep an annual exit** changes what is available. **Send offers for approval**.
6. The strip shows the business owner’s turn, then Finance’s; **View as business owner** / **View as Finance** play them.
7. **Preview supplier view** → **Send to CloudDesk** → **View as supplier**: pick “Pay faster”, suggest a 7% cap.
8. **Accept** (₹1.1 lakh, inside the ₹1.5 lakh range) → **Send for signature** → **Run the first invoice check**: ₹25,000 expected, ₹0 found, **Credit flagged for follow-up**, assigned to Riya.

**Account:** the RK button opens the account menu (Edit my profile, Workspace data access, Sign out). Profile edits persist in the browser, update initials and greetings everywhere, and never change permissions.

To see the evidence change, open **Workspace data access** and switch **Use aggregate peer benchmarks** off: the 15-day estimate becomes “Insufficient internal history to estimate” (you can still draft it), and SwiftShip's estimates disappear.

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
