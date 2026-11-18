# Cost of Yes: build spec

Version 1 · 18 Nov 2026 · for Claude Code

This spec turns the "Cost of Yes" product brief into a working prototype hosted on Vercel. It is written for Claude Code, and each phase in §11 has a prompt you can paste in as-is. Everything here matches the brief's numbers. If code and spec disagree, the spec wins until it is updated.

---

## 1. What we are building

A Sirion-style web app for the **negotiation** stage, built around one interactive demo. CloudDesk, a fictional helpdesk software supplier on a ₹60 lakh a year contract, sends back its renewal contract with six changes. The app walks that redline from inbox to signature in about three minutes:

1. Sort the six changes into harmless, legal and money.
2. Put a ₹ price tag on each of the three money lines, with proof.
3. Build three give-get packages.
4. Get approval from the business owner, and from finance where needed.
5. The supplier picks a package in a supplier portal and counters one line.
6. Re-price the counter; the lead accepts it.
7. Signing summary: every money line is enforceable and linked to a Sirion tracker. About ₹9.2 lakh a year is protected.

Around the demo sit a Sirion-style dashboard, a redline inbox, an Ask panel (a narrow chatbot), an insights page and a `/story` page. The story page holds the sections the assignment wants inside the prototype.

**Who uses it in the demo:** the procurement lead (main user), the business owner, finance, legal and the supplier. A role switcher in the top bar lets one presenter play every role.

---

## 2. Ground rules (same as CLAUDE.md, with detail)

| Rule | What it means in code |
| --- | --- |
| Numbers from code | `lib/engines/*` compute every figure from `data/*.json`. The LLM never returns a number that is shown to users unless that number came from a tool result. |
| Golden numbers | §6.6 values are asserted in `tests/golden.test.ts` to ±0.005 lakh. |
| Demo-safe | Every AI route returns `{ source: "live" | "cached", ... }`. The UI shows a small grey badge "AI: live" or "AI: cached". Fallback fixtures live in `data/fixtures/`. |
| Brand | Sirion-style look with our own name and mark. There is a footer disclaimer. No Sirion logo or wordmark. No login page. |
| Privacy | The supplier never sees ₹ figures, pooled numbers or internal notes. The supplier-facing reason writer must not mention ₹ amounts or other customers. |
| Fictional data | All suppliers, people and numbers are invented. The `/story` page says so. |

---

## 3. Tech stack

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js, App Router, TypeScript | Deploys to Vercel without extra config |
| Styling | Tailwind CSS + shadcn/ui | Theme tokens in §4 go into `tailwind.config` and CSS variables |
| Charts | Recharts | Stacked bars, donuts, line chart (see §4.4) |
| Icons | lucide-react | Sidebar icons: Home, Inbox, CheckSquare, Scale, Store, LineChart, BookOpen |
| State | Zustand + `persist` (localStorage) | One store; "Reset demo" clears it |
| Markdown | react-markdown | Renders `content/story.md` on `/story` |
| Validation | zod | Validates every AI response before use |
| AI | `@anthropic-ai/sdk` (TypeScript) | Server-side only. Use tool use with a forced tool for structured output. Check the current SDK docs for exact syntax. |
| Models | `claude-haiku-5-5` for sorting; `claude-sonnet-5-5` for the Ask panel and reasons | Read model names from env vars (`MODEL_FAST`, `MODEL_SMART`) so they can be changed without code edits |
| Tests | Vitest | Engines, seed aggregates, golden numbers, zod schemas |
| Hosting | Vercel (Hobby plan is enough) | See §12 |

---

## 4. Design system: Sirion style

### 4.1 Reference screenshots (`docs/design-reference/`)

| File | Use it for |
| --- | --- |
| `04-dashboard-main.png` | **Primary reference.** App shell, sidebar, top bar, card style, chart colours, KPI tile |
| `06-dashboard-main-alt.png`, `01-dashboard-small.png` | Same design, other crops |
| `02-service-levels-and-obligations.png` | Donut with leader labels, horizontal stacked bars, single-colour bar chart |
| `09-dashboard-trend-and-donut.png` | Line-plus-bar trend chart and the floating donut card |
| `03-contracts-table-with-ask-panel.png` | Data table (columns, status, pagination) with the Ask panel docked on the right |
| `07-asksirion-panel.png` | Ask panel styling: question heading, "Sources" chips, "Response" with teal links, donuts, input pill with round send button |
| `08-legacy-buy-side-kpis.png` | KPI tile layout only (big number + small caption). **Do not** copy its old green colours |
| `05-legacy-executive-dashboard.png` | Older Sirion style. **Do not** copy its colours |
| `10-workflow-list-pattern-not-sirion.png` | Not a Sirion screen. Borrow only the list-with-saved-views-and-filters pattern for the redline inbox |

Keep `docs/design-reference/` out of git (add it to `.gitignore`). The screenshots belong to Sirion.

### 4.2 Colour tokens

Colours marked "sampled" were taken from `04-dashboard-main.png`. The rest are close fits; adjust them by eye against the screenshot.

| Token | Hex | Source | Used for |
| --- | --- | --- | --- |
| `teal-900` (primary) | `#0C5E69` | sampled | Sidebar, primary buttons, main chart series, donut main arc, KPI numerals, links |
| `teal-700` | `#0F6671` | sampled | Hover and active states, second teal series |
| `teal-title` | `#1E5A57` | sampled (approx.) | Card titles, page title |
| `periwinkle` | `#828BFC` | sampled | Chart series 1 (stacked-bar base) |
| `mint` | `#B1D0CA` | sampled | Chart series 3, light donut arcs, subtle fills |
| `indigo` | `#4364B2` | sampled | Small donut segments, info accents |
| `lime` | `#E0E767` | sampled | "Others" segment, warning highlight |
| `page-bg` | `#F6F6F6` | sampled | App background |
| `card` | `#FFFFFF` | sampled | Cards |
| `border` | `#E6EBEB` | close fit | Card border, dividers |
| `text` | `#1F2A2E` | close fit | Body text |
| `text-muted` | `#7D9093` | sampled | Captions, axis labels, secondary text |
| `danger` | `#C2410C` | close fit | Only for "not enforceable" and failed checks |

Chart series order is periwinkle, teal-900, mint, indigo, lime.

### 4.3 Layout and components

- **Sidebar:** fixed, 64 px wide, `teal-900` background. White outline icons, one per route. The active item is a white square tile with a teal icon. Our own mark sits at the top: a simple white "Y" or ring icon, not Sirion's logo. The disclaimer footer appears on hover or expand.
- **Top bar:** white, 64 px tall. On the left, a breadcrumb or search placeholder (light grey pill). On the right: the role switcher dropdown ("Viewing as: Procurement lead ▾"), a bell, a help icon, and a teal circle avatar with initials.
- **Page header:** page title in `teal-title` (20 px, regular weight) on the left. A secondary outlined grey button on the right (e.g. "Create dashboard", disabled, or "Demo guide").
- **`<SirionCard>`:** white, 16 px radius, 1 px `border`, a very soft shadow, 24 px padding. Title in `teal-title` at 15 px regular, a kebab menu (⋮) top right, and a 1 px divider under the title.
- **KPI tile:** a dark label ("Overdue"-style) in 20 px, the big numeral in `teal-900` at 56 px light weight, and a muted caption below ("Avg. Aging (days) 32.5"-style).
- **Tables:** header row in muted text, 48 px rows, status shown as small pills (e.g. "Active" style), and a footer reading "Rows per page 10 · 1–8 of 8".
- **Chips:** outlined pills with a small icon. Used for Ask panel sources and filters.
- **Font:** Inter via `next/font`, falling back to system sans.

### 4.4 Charts (Recharts)

- **Stacked bars:** rounded top only. Series colours follow the order above. Legend sits below, with small square swatches and 11 px text.
- **Donut:** thick ring (inner radius about 70% of outer), labels outside with thin leader lines, no centre text unless stated.
- **Single-series bars:** `teal-900`.
- **Trend:** mint bars with a periwinkle line and dots.
- **Axes:** light grid lines and muted 11 px tick labels.

---

## 5. Data model and seed data

### 5.1 Types (`lib/types.ts`)

```ts
export type SupplierType = 'software' | 'staffing' | 'logistics' | 'facilities';
export type Line = 'renewal' | 'credits' | 'price';

export type RenewalGroup = 'opt_in' | 'notice_le_30' | 'notice_60_90';
export type CreditsGroup = 'automatic' | 'claim_le_10' | 'claim_11_30' | 'claim_30_autofiled';
export type PriceGroup = 'fixed' | 'cap_5' | 'cap_7' | 'open_yearly';
export type WordingGroup = RenewalGroup | CreditsGroup | PriceGroup;

export interface Contract {
  id: string;                 // e.g. 'C-017'
  supplier: string;
  supplierType: SupplierType;
  annualFeeInr: number;
  seats?: number;
  startDate: string;          // ISO
  endDate: string;            // ISO
  renewalWording: 'auto_renew' | 'opt_in';
  noticeDays: number | null;
  creditWording: 'automatic' | 'claim_based';
  claimWindowDays: number | null;
  priceWording: 'fixed' | 'capped' | 'open_yearly';
  priceCapPct: number | null;
  paymentDays: number;
  businessOwner: string;      // fictional name
}

export interface InvoiceLine {
  id: string; contractId: string; date: string; item: string;
  qty: number; agreedUnitPriceInr: number; invoicedUnitPriceInr: number;
}

export interface ServiceEvent {
  contractId: string; month: string;      // 'YYYY-MM'
  target: number; actual: number;         // e.g. uptime % or response %
  creditOwedInr: number; creditReceivedInr: number;
}

export interface Renewal {
  contractId: string; renewalDate: string;
  reviewed: boolean; seatsPaid: number; seatsUsed: number;
}

export interface PooledRate {
  supplierType: SupplierType; line: Line; wordingGroup: WordingGroup;
  companies: number;          // must be >= 20 to show
  figure: number;             // e.g. 0.60 = 60% of credits unclaimed
  label: string;              // 'About 6 in 10 credits unclaimed'
}

export interface WordingOption {
  id: string; line: Line; wordingGroup: WordingGroup;
  text: string;               // clause text
  plainReason: string;        // supplier-facing, no ₹, no other customers
  enforceable: boolean;
  sirionCheck: string;        // e.g. 'Credit check on every invoice'
}

export interface RedlineChange {
  no: number; clause: string; title: string;
  oldText: string; newText: string;
  expected: { group: 'harmless' | 'legal' | 'money'; line?: Line; wordingGroup?: WordingGroup };
}

export interface Redline {
  id: string; contractId: string; supplier: string; supplierType: SupplierType;
  receivedAt: string; interactive: boolean;
  changes: RedlineChange[];             // only for interactive redlines
  summary?: { harmless: number; legal: number; money: number; atStakeLakh: number }; // display-only rows
}

export type GiveId = 'term_3y' | 'payment_30' | 'notice_60' | 'claim_30_autofiled';

export interface PackageTemplate {
  id: 'A' | 'B' | 'C'; name: string;
  gives: GiveId[];
  wordings: { renewal: RenewalGroup; credits: CreditsGroup; price: PriceGroup };
}
```

### 5.2 Seed files (`data/`)

| File | Rows | Notes |
| --- | --- | --- |
| `contracts.json` | 40 | 25 software, 6 staffing, 5 logistics, 4 facilities |
| `invoices.json` | about 960 | 24 monthly lines per contract (2 years) |
| `service_events.json` | 300 | 25 software contracts × 12 months |
| `renewals.json` | 22 | Past renewals of software auto-renew contracts |
| `pooled_rates.json` | about 12 | Two rows are fixed (§5.4); the rest are plausible |
| `wording_library.json` | 10 | See §5.5 |
| `redlines.json` | 6 | 1 interactive (CloudDesk) + 5 display-only |
| `package_templates.json` | 3 | See §6.4 |
| `kpi_history.json` | small | North-star counts and rounds-to-sign (§8.2) |
| `learning.json` | 6 | Predicted vs actual (§8.8) |
| `fixtures/*.json` | 3+ | Cached AI outputs (§7) |

`scripts/generate-seed.ts` builds the first five files deterministically, using a fixed-seed PRNG (e.g. mulberry32 with seed 2026). Run it with `npm run seed`. The remaining files are hand-written JSON.

### 5.3 Exact targets the generator must hit (asserted in `tests/seed.test.ts`)

All targets apply to the **25 software contracts**.

| What | Target |
| --- | --- |
| Renewal groups | 12 auto-renew with 60 or 90 days' notice; 10 auto-renew with 15 or 30 days' notice; 3 opt-in. Total 25 |
| Credits groups | 14 claim-based with a 5, 7 or 10-day window; 11 automatic. Total 25 |
| Price groups | 9 open yearly revision; 10 capped at 5%; 6 fixed. Total 25 |
| CloudDesk `C-017` | 500 seats, ₹12,000 a seat → `annualFeeInr` 6,000,000; auto-renew, 30 days' notice; automatic credits; fixed price; payment 45 days |
| Unreviewed renewals | 5 of the 12 in `notice_60_90`; 1 of the 10 in `notice_le_30`; 0 opt-in |
| Unused share | Unused shares of the 6 unreviewed renewals are 0.12, 0.15, 0.18, 0.21, 0.24 (the 60–90 group) and 0.18 (the ≤30 group). Mean = **0.18** exactly |
| Credit recovery | Σreceived / Σowed = **0.22** for `claim_le_10` and **0.94** for `automatic` (±0.001; adjust the last row to land exactly) |
| CloudDesk credits | Σ creditOwedInr over its 12 months = **450,000** |
| Price rises (year 2 vs year 1, mean per contract) | `open_yearly` = **0.11** (use 0.08, 0.09, 0.10, 0.11, 0.11, 0.12, 0.12, 0.13, 0.13); `cap_5` = **0.046** (six at 0.05, four at 0.04); `fixed` = 0 |
| Other supplier types | Any plausible mix; not used in CloudDesk numbers |
| Names | Must include CloudDesk (C-017, software), Nimbus HR Cloud (C-004, software, 90 days' notice, 10-day claim, open yearly, ₹24 lakh, payment 30), SwiftShip Logistics (C-022, logistics, opt-in, 15-day claim, 5% cap, ₹36 lakh, payment 45), BrightStaff Services (staffing), CleanCo Facilities (facilities), DataVault, CloudOps Suite and HelpHub (software). Invent the rest. |
| Dates | Contract end dates spread over the next 6 to 18 months, so the "notice deadlines" chart has data in each of the next 6 months |

### 5.4 Fixed pooled rates

| supplierType | line | wordingGroup | companies | figure | label |
| --- | --- | --- | --- | --- | --- |
| software | credits | claim_le_10 | 31 | 0.80 | About 8 in 10 credits unclaimed |
| software | credits | claim_11_30 | 27 | 0.60 | About 6 in 10 credits unclaimed |

Add about 10 more plausible rows across types and lines, all with companies ≥ 20 except one row with 14 companies. The UI must hide that row's figure and show "Not enough companies yet".

### 5.5 Wording library (`wording_library.json`)

| id | line | wordingGroup | text | plainReason | enforceable | sirionCheck |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | renewal | opt_in | "This Agreement renews only if Customer confirms in writing before the end of the Term." | Renewal becomes a clear yes from both sides. | true | Renewal decision task on a fixed date |
| R2 | renewal | notice_le_30 | "This Agreement renews automatically unless either party gives thirty (30) days' written notice." | A 30-day window gives both sides time to plan without a long lock-in. | true | Renewal alert 45 days before the notice deadline |
| R3 | renewal | notice_60_90 | "…sixty (60) days' written notice." | A middle ground on notice. | true | Renewal alert 75 days before the notice deadline |
| S1 | credits | automatic | "Service credits are applied automatically to the next invoice." | Saves both sides the work of tracking and claiming credits. | true | Credit check on every invoice |
| S2 | credits | claim_30_autofiled | "Service credits are claimed within thirty (30) days; Supplier accepts claims filed through Customer's contract system." | Claims arrive on time and in one format. | true | Claim filed automatically on day 2 |
| S3 | credits | claim_le_10 | "…only if Customer submits a written claim within ten (10) days…" | (not offered) | false | None. Relies on people remembering |
| P1 | price | fixed | "The Fees are fixed for the Term." | Predictable budgets on both sides. | true | Invoice price check |
| P2 | price | cap_5 | "Fees may increase once per contract year by no more than five percent (5%), with sixty (60) days' written notice." | Lets prices move with costs, within a known limit. | true | Invoice price check against the cap |
| P3 | price | cap_7 | "…no more than seven percent (7%)…" | A slightly higher limit, still predictable. | true | Invoice price check against the cap |
| P4 | price | open_yearly | "Supplier may revise the Fees once in each contract year by written notice." | (not offered) | false | None. No price to check against |

### 5.6 The CloudDesk redline (`redlines.json`, id `RL-CLOUDDESK`)

| no | clause | title | old text | new text | expected |
| --- | --- | --- | --- | --- | --- |
| 1 | 18.2 | Notices | "…Level 4, 12 MG Road, Bengaluru…" | "…Tower B, 7th Floor, Outer Ring Road, Bengaluru…" | harmless |
| 2 | 1.1 | Definitions | "effective date" | "Effective Date" | harmless |
| 3 | 12.1 | Limitation of liability | "…fees paid in the twelve (12) months before the claim." | "…fees paid in the six (6) months before the claim." | legal |
| 4 | 3.2 | Renewal | "…unless either party gives thirty (30) days' written notice." | "…unless either party gives ninety (90) days' written notice." | money · renewal · notice_60_90 |
| 5 | 7.4 | Service credits | "Service credits are applied automatically to the next invoice." | "Service credits are payable only if Customer submits a written claim within ten (10) days of the end of the month in which the failure occurred." | money · credits · claim_le_10 |
| 6 | 9.1 | Fees | "The Fees are fixed for the Initial Term and any Renewal Term." | "Supplier may revise the Fees once in each contract year by written notice." | money · price · open_yearly |

**Display-only redlines** (inbox and dashboard only; clicking them shows "Demo: only CloudDesk is interactive"):

| supplier | type | harmless | legal | money | ₹ at stake (lakh/yr) |
| --- | --- | --- | --- | --- | --- |
| SwiftShip Logistics | logistics | 1 | 0 | 2 | 5.8 |
| Nimbus HR Cloud | software | 3 | 1 | 1 | 3.2 |
| BrightStaff Services | staffing | 2 | 1 | 2 | 2.1 |
| CleanCo Facilities | facilities | 4 | 0 | 1 | 0.9 |
| DataVault | software | 0 | 2 | 0 | 0.0 |

---

## 6. Engines (`lib/engines/`), all pure and all tested

Units: engines work in **lakh** (₹ / 100,000). Format only at the UI edge.

### 6.1 Benchmarks

"Cost of a wording" means the expected yearly loss compared with the line's benchmark wording:

| Line | Benchmark (cost 0) |
| --- | --- |
| renewal | `opt_in` (cannot renew without our confirmation) |
| credits | `automatic` |
| price | `cap_5` |

A wording that beats the benchmark (e.g. `fixed` price) gets a negative cost. Show it as "₹2.8 lakh better than benchmark".

### 6.2 Cost engine (`costEngine.ts`)

```
fee = contract.annualFeeInr / 1e5                       // lakh

// Renewal
pUnreviewed(g)  = unreviewed renewals in group g / renewals in g   (software, joined via contract notice days)
unusedShare     = mean(1 - seatsUsed/seatsPaid) over unreviewed software renewals   // 0.18
renewalCost(g)  = g === 'opt_in' ? 0 : pUnreviewed(g) * unusedShare * fee

// Credits
recovery(g)     = Σ creditReceived / Σ creditOwed over software contracts in g
                  // claim_30_autofiled: assumption 0.90 (label it "assumption")
                  // own n < 8: use pooled → 1 - pooled.figure (only if companies >= 20)
owed            = Σ creditOwedInr over the contract's last 12 months / 1e5      // 4.5 for CloudDesk
creditsCost(g)  = owed * (recovery('automatic') - recovery(g))

// Price
expectedRise(g) = open_yearly: mean observed rise (0.11)
                  cap_5:       mean observed rise (0.046)
                  cap_7:       0.07 * (0.046 / 0.05)        // = 0.0644 (suppliers price near the cap)
                  fixed:       0
priceCost(g)    = (expectedRise(g) - expectedRise('cap_5')) * fee
```

`priceTag(contract, line, group)` returns:

```ts
{ line, group, costLakh, confidence: 'high'|'medium'|'low'|'none',
  n: number,                          // own contracts in the group
  source: 'own' | 'pooled' | 'assumption',
  proof: string[],                    // plain sentences built from the numbers
  pooledBackup?: { companies, label } }
```

Confidence rules: n ≥ 20 → high; 8–19 → medium; below 8 → use pooled if available (`source: 'pooled'`, confidence low), else `'none'` with the text "Not enough history".

### 6.3 Give costs (`gives.ts`)

| GiveId | Cash cost to us (lakh/yr) | Commitment | Supplier value (software) | Needs finance? |
| --- | --- | --- | --- | --- |
| `term_3y` | 0 | 3 × fee (₹1.8 crore) | high | yes (commitment > 1 year) |
| `payment_30` | fee × 0.09 × (45 − 30) / 365 = **0.2219** | none | medium | only if > ₹5 lakh/yr |
| `notice_60` | 0 (its cost shows up in the renewal residual) | none | medium | no |
| `claim_30_autofiled` | 0 (shows up in the credits residual) | none | medium | no |

Settings (`lib/settings.ts`): `COST_OF_MONEY = 0.09`, `FINANCE_CASH_LIMIT_LAKH = 5`, `LEAD_RANGE_LAKH_PER_LINE = 1.5`, `MIN_OWN_N = 8`, `MIN_POOLED_COMPANIES = 20`, `AUTOFILED_RECOVERY = 0.90`.

### 6.4 Give-get engine (`givegetEngine.ts`)

For the prototype, packages come from `package_templates.json`, and the engine prices and ranks them. The code should still be generic, so swapping templates needs no code changes.

| id | name | gives | wordings (renewal / credits / price) |
| --- | --- | --- | --- |
| A | Certainty | term_3y | opt_in / automatic / cap_5 |
| B | Pay faster | payment_30 | notice_le_30 / automatic / cap_5 |
| C | Meet halfway | notice_60, claim_30_autofiled | notice_60_90 / claim_30_autofiled / cap_5 |

```
supplierAsk = { renewal: 'notice_60_90', credits: 'claim_le_10', price: 'open_yearly' }   // from the redline
protected(pkg) = Σ_line [ cost(supplierAsk[line]) - cost(pkg.wordings[line]) ]
net(pkg)       = protected(pkg) - Σ cashCost(gives)
approvals(pkg) = ['lead'] + ('finance' if any give needs finance)
```

Rank packages by `net`, and show all three. `buildPackages({ excludeGives })` drops any template that uses an excluded give. The Ask panel uses this.

### 6.5 Counter-offers and final deal (`negotiation.ts`)

- `priceCounter(currentGroup, proposedGroup)` gives the extra cost = cost(proposed) − cost(current). It is inside the lead's range if ≤ `LEAD_RANGE_LAKH_PER_LINE`.
- `finalDeal(pkg, counters)` applies the counters and returns, per line: wording option, residual cost, enforceable, sirionCheck. It also returns totals: protected, give cost, net, and enforceable count (e.g. 3 of 3).

### 6.6 Golden numbers (tests must assert these)

| Name | Value (lakh) | UI shows |
| --- | --- | --- |
| Renewal tag (90 days' notice) | 4.5000 | ₹4.5 lakh |
| Credits tag (10-day claim) | 3.2400 | ₹3.2 lakh |
| Price tag (yearly revision) | 3.8400 | ₹3.8 lakh |
| Total at stake | 11.5800 (19.3% of fee) | ₹11.6 lakh |
| Package A protected | 11.5800 | ₹11.6 lakh |
| Package B protected | 10.5000 | ₹10.5 lakh |
| Package C protected | 6.9000 | ₹6.9 lakh |
| Give `payment_30` cost | 0.2219 | about ₹22,000 |
| Package A commitment | 180.00 | ₹1.8 crore |
| Counter: 7% vs 5% cap | 1.1040 | ₹1.1 lakh |
| Final deal protected (B, cap 7%) | 9.3960 | ₹9.4 lakh |
| Final deal net | 9.1741 | ₹9.2 lakh |
| What-if: 15-day claim (pooled) | 2.4300 | ₹2.4 lakh |
| Renewal residual at 30 days | 1.0800 | ₹1.1 lakh |

Rounding: show lakh to one decimal place. Below ₹1 lakh, show rupees rounded to the nearest thousand (₹22,000). At ₹1 crore and above, show crore to one decimal place.

---

## 7. AI features (`lib/server/`, `app/api/`)

All AI routes:

- validate input and output with zod;
- set a 20 s timeout;
- fall back to `data/fixtures/*` on any failure, or when `DEMO_MODE=cached` or no key is set;
- return `source: 'live' | 'cached'`.

Each route file sets `export const maxDuration = 60`.

### 7.1 Sorter: `POST /api/sort`

- **Input:** `{ redlineId }`. **Model:** `MODEL_FAST`.
- Uses one tool, `classify_changes`, forced with `tool_choice`. Its input schema is an array of `{ no, group: 'harmless'|'legal'|'money', line?: Line, wordingGroup?: WordingGroup, confidence: 0..1, reason: string (≤ 20 words) }`.
- **System prompt (summary):** you sort supplier contract changes. "Harmless" means wording, address, typo or formatting only. "Legal" means liability, indemnity, IP, data protection or governing law. "Money" means renewal or notice, service credits or SLAs, and price or fees. For money lines, choose the closest wording group from the list provided. Never invent changes.
- **After the call:** any change with confidence below 0.7 is shown as "Needs a person" and goes to the lead. If a result disagrees with `expected`, use the fixture and log a warning (the demo stays on script).
- **Fixture:** `fixtures/sort_clouddesk.json`.

### 7.2 Reason writer: `POST /api/reasons`

- **Input:** `{ wordingOptionIds }`. **Model:** `MODEL_SMART`.
- Writes one supplier-facing sentence (≤ 25 words) per option. It must not mention ₹ amounts, internal costs, other customers or other suppliers. Start from the library's `plainReason` and lightly tailor it to CloudDesk.
- **Fixture:** `fixtures/reasons_clouddesk.json` (the library's plainReasons).

### 7.3 Ask panel: `POST /api/ask`

- **Input:** `{ messages, redlineId, role }`. **Model:** `MODEL_SMART`. Uses an agent loop with tools until `end_turn`, at most 4 tool rounds.
- **Tools** (all read-only and run on the server against the engines):

| Tool | Input | Returns |
| --- | --- | --- |
| `get_price_tag` | `{ line }` (for the current redline's supplier wording) | priceTag object |
| `run_what_if` | `{ line, wordingGroup }` | priceTag object for that wording |
| `build_packages` | `{ excludeGives?: GiveId[] }` | ranked packages with protected, net, approvals |
| `draft_reason` | `{ wordingOptionId }` | `{ text }` |

- **System prompt rules:**
    - Answer in 80 words or fewer, in plain English.
    - Every number must come from a tool result in this conversation.
    - Always say how many contracts (or companies) a number rests on.
    - If a tool returns `confidence: 'none'`, say "not enough history".
    - You cannot send, approve or sign anything; you can only calculate and draft.
    - Only discuss the current negotiation; otherwise say AskSirion covers portfolio questions.
    - If role is `supplier`, refuse and say the supplier view has no assistant.
- **Response shape** (for the Sirion-style render): `{ answer, sources: Chip[], links: { label, href }[], toolCalls: string[], source }`.
- **Fixtures** (`fixtures/ask_examples.json`) cover the three suggested questions:
    1. "Why is the credits line ₹3.2 lakh?"
    2. "What if we accept a 15-day claim window?"
    3. "Show packages without the 3-year term"

    In cached mode, any other question gets: "The live assistant is off in this demo. Try one of the suggested questions."
- **Guards:** max 8 messages of history, 500 characters per user message, `max_tokens` 600.

---

## 8. Pages and routes

The app shell (sidebar + top bar) wraps every route except `/portal/*`, which uses a plain supplier layout.

### 8.1 Role switcher and demo guide

- **Roles:** Procurement lead (default), Business owner, Finance, Legal, Supplier. Switching role changes the sidebar items and redirects to that role's home. Supplier goes to `/portal/clouddesk`.
- **Demo guide:** a floating button, bottom right, that opens a panel with steps 1–9 (§13), each with a "Go" link and a tick once done (driven by store status).
- **Reset demo:** in the guide panel. It clears the store.

### 8.2 `/`: Dashboard (lead home), modelled on `04-dashboard-main.png`

The grid has 2 columns on desktop and 1 on mobile. Cards:

1. **KPI: "Money at stake in open redlines"**: Σ atStake = **₹23.6 lakh a year** (CloudDesk 11.6 + others 12.0). Caption: "6 open redlines".
2. **KPI: "Money lines enforceable at signing"** (the north star): 18 of 29 = **62%** before CloudDesk signs; 21 of 32 = **66%** after. The value comes from `kpi_history.json` plus the store.
3. **"At stake by open redline"**: single-series teal bars, one per supplier.
4. **"Credits owed vs recovered (12 months)"**: stacked bars by credits wording group (recovered = teal, lost = mint), computed from service events.
5. **"Notice deadlines: next 6 months"**: single-colour bars by month, computed from contracts (end date minus notice days, auto-renew only).
6. **"Money lines by wording"**: donut over software contracts' credit wording (automatic vs claim-based), with leader labels.

**Acceptance:** looks like the reference at a glance (sidebar, cards, colours, chart style); every number comes from engines or seed data.

### 8.3 `/redlines`: Redline inbox

- A table modelled on `03-…png` and the list pattern from `10-…png`. Saved views on the left: "Waiting on me", "All", "With supplier", "Signed".
- **Columns:** Supplier, Type, Received, Changes (three small pills: harmless / legal / money), ₹ at stake / yr, Status.
- CloudDesk is first, with a teal "New" dot. Clicking it opens `/redlines/RL-CLOUDDESK`.

### 8.4 `/redlines/[id]`: Negotiation board (main screen)

The layout is a header strip plus tabs, with the Ask panel docked on the right (collapsible; 360 px; styled like `07-asksirion-panel.png`).

- **Header strip:** supplier name, contract value (₹60 lakh/yr, 500 seats), status pill, "₹11.6 lakh a year at stake (19% of fee)", and a step indicator (Sorted → Priced → Packages → Approval → Supplier → Signed).
- **Tab "Changes":** the 6 changes as cards showing old vs new text (with a diff highlight) and a group pill. Harmless changes show "Approved by Cost of Yes · logged". The legal change shows "Sent to legal". Money changes show "Price tag ready". A "Sort changes" button calls `/api/sort` on first visit; status moves to `sorted`, then `priced`.
- **Tab "Price tags":** 3 `<SirionCard>`s. Each shows the line name, a big ₹ figure ("₹3.2 lakh a year"), "Cost if we say yes", a confidence pill ("Medium · 14 contracts"), proof sentences, and a pooled backup chip if present. "See the contracts" opens a drawer listing the group's contracts and their outcomes.
- **Tab "Packages":** 3 package cards side by side, each showing gives, gets, "Protects ₹X lakh a year", net, and approval chips (Lead / Finance). The lead can untick a package. "Send for approval" moves status to `awaiting_approval`.
- **Tab "Signing":** only enabled when status is `agreed` (see §8.7).
- **Ask panel:** the heading "Ask Cost of Yes", three suggested question chips, a message list rendering `answer` + "Sources" chips + teal links, and an input pill with a round teal send button. An "AI: live/cached" badge sits at the bottom.

### 8.5 `/approvals`: Business owner and finance

- **Business owner role:** a Teams-style card (white card, small bot avatar, bold title). It reads "CloudDesk renewal: approve 3 packages?" and lists facts: "Get back up to ₹11.6 lakh a year", "We may give a 3-year term or faster payment", "Legal is handling 1 change separately". Buttons: **Approve** and **Ask a question** (a disabled tooltip is fine).
- **Finance role:** a table of gives needing finance. Only package A appears ("3-year term · ₹1.8 crore commitment"), with Approve / Reject buttons. B's give appears greyed: "₹22,000 a year · under ₹5 lakh limit · no finance step".
- When the owner has approved and finance has decided, status moves to `approved`, and the lead sees a "Send to CloudDesk" button on the board. Clicking it moves status to `with_supplier`.

### 8.6 `/legal`: Legal queue (light)

A list showing only change 3, with its old and new text. Buttons: Accept / Reject / Redline. Reject sets a note: "Liability cap stays at 12 months' fees." This never blocks the money flow.

### 8.7 `/portal/clouddesk`: Supplier menu (supplier layout)

- **Header:** white, with "Supplier portal · CloudDesk" and a small "Concept" tag. No Sirion branding.
- **Body:** "Choose a package" with 3 cards. Each lists its terms in plain words with the reason from `/api/reasons` per line. **No ₹ figures, no costs, no pooled data.**
- **Actions:** select a package; optional "Suggest one change" lets the supplier pick one line and choose from the allowed alternatives (price: 7% cap). Submit.
- **On submit:** status becomes `countered` (or `agreed` if there is no counter), and a toast reads "Sent to Procurement".
- **Back on the board, with a counter:** a banner reads "CloudDesk picked B and asked for a 7% price cap: ₹1.1 lakh a year more, inside your ₹1.5 lakh range". There is an **Accept** button; accepting sets status to `agreed`.
- **Signing tab:** a table with Line | Agreed wording | Enforceable ✓ | Sirion tracker | First check. KPI tiles: "3 of 3 lines enforceable", "₹9.4 lakh a year protected", "₹9.2 lakh a year net". A **"Send for signature"** button (mock) sets status to `signed` and updates the dashboard north-star KPI to 66%.

### 8.8 `/insights`: Learning view and pooled numbers

- **"Predicted vs actual (last year)":** grouped bars or a dot plot from `learning.json`:

| line | supplier | predicted | actual |
| --- | --- | --- | --- |
| Renewal, 90 days | Nimbus HR Cloud | 2.1 | 2.4 |
| Credits, 10-day claim | SwiftShip Logistics | 1.6 | 1.4 |
| Price, yearly revision | BrightStaff Services | 0.9 | 1.1 |
| Renewal, 60 days | HelpHub | 1.2 | 0.8 |
| Credits, 7-day claim | DataVault | 2.0 | 2.3 |
| Price, yearly revision | CloudOps Suite | 1.5 | 1.6 |

    Flag rows where |actual − predicted| / predicted > 25%. HelpHub is −33%. The flag reads "Prediction missed: review this group".
- **"Pooled numbers":** a table of `pooled_rates` with a companies column. Rows under 20 companies show "Not enough companies yet". A short privacy note: counts only, 20+ companies, a little noise added, data 6+ months old, opt-in.

### 8.9 `/story`: Assignment sections inside the prototype

Renders `content/story.md`, with a left table of contents: Why this stage · The problem · Stakeholder map · How it works · Data and privacy · Success metrics · Assumptions · Sources. The disclaimer goes at the top.

---

## 9. State (`lib/store.ts`)

```ts
type Status = 'received' | 'sorted' | 'priced' | 'packages_ready' | 'awaiting_approval'
            | 'approved' | 'with_supplier' | 'countered' | 'agreed' | 'signed';

interface DemoState {
  role: 'lead' | 'owner' | 'finance' | 'legal' | 'supplier';
  status: Status;
  sortResult?: SortResult;               // from /api/sort
  selectedPackages: ('A'|'B'|'C')[];     // default all
  ownerApproved: boolean;
  financeDecision?: { A: 'approved' | 'rejected' };
  supplierPick?: 'A' | 'B' | 'C';
  counter?: { line: 'price'; group: 'cap_7' };
  legalDecision?: 'accepted' | 'rejected' | 'redlined';
  signedAt?: string;
  completedSteps: number[];              // for the demo guide
  // actions: setRole, sort, sendForApproval, approveOwner, decideFinance, sendToSupplier,
  //          supplierSubmit, acceptCounter, sign, reset
}
```

Each action checks that the current status allows the move. Out-of-order clicks show a friendly toast: "Waiting for finance approval".

---

## 10. API routes

| Route | Method | In | Out |
| --- | --- | --- | --- |
| `/api/sort` | POST | `{ redlineId }` | `{ results: ChangeClass[], source }` |
| `/api/price-tags` | GET | `?redlineId=` | `{ tags: PriceTag[], totalLakh, pctOfFee }` (engine only, no AI) |
| `/api/packages` | GET | `?redlineId=&exclude=` | `{ packages: PricedPackage[] }` (engine only) |
| `/api/reasons` | POST | `{ wordingOptionIds }` | `{ reasons: Record<id,string>, source }` |
| `/api/ask` | POST | `{ messages, redlineId, role }` | `{ answer, sources, links, toolCalls, source }` |
| `/api/final-deal` | POST | `{ pkg, counters }` | final deal object (engine only) |

Engines can also run client-side for instant UI. The API versions exist so the Ask panel's tools and the UI share one code path.

---

## 11. Build phases (paste these prompts into Claude Code)

Tip: ask Claude Code to show its plan before it writes code in each phase, and check the plan against this spec.

**Phase 0: Setup**
```
Read CLAUDE.md and docs/BUILD_SPEC.md §1–§3. Create a Next.js App Router project with TypeScript, Tailwind, ESLint and the src-less app/ layout in this folder (keep CLAUDE.md, docs/, content/). Add shadcn/ui, Recharts, lucide-react, zustand, react-markdown, zod, @anthropic-ai/sdk and vitest. Add npm scripts: test, seed. Add .env.example with ANTHROPIC_API_KEY=, DEMO_MODE=cached, MODEL_FAST=claude-haiku-5-5, MODEL_SMART=claude-sonnet-5-5. Add docs/design-reference/ and .env*.local to .gitignore. Done when npm run dev shows a blank page and npm test runs (zero tests is fine).
```

**Phase 1: Design system and app shell**
```
Read BUILD_SPEC §4 and look at docs/design-reference/04-dashboard-main.png and 07-asksirion-panel.png. Implement the colour tokens, Inter font, the 64px teal sidebar with icon nav and our own simple mark (not Sirion's logo), the white top bar with role switcher, bell, help and avatar, the page header, <SirionCard>, <KpiTile>, <Chip>, <StatusPill> and the disclaimer footer. Create empty routes for /, /redlines, /redlines/[id], /approvals, /legal, /portal/clouddesk (plain supplier layout), /insights, /story. Done when the shell matches the reference at a glance and every route renders.
```

**Phase 2: Seed data and tests**
```
Read BUILD_SPEC §5. Write lib/types.ts, scripts/generate-seed.ts (deterministic PRNG, seed 2026) and the hand-written JSON files (pooled_rates, wording_library, redlines, package_templates, kpi_history, learning). Write tests/seed.test.ts asserting every target in §5.3 and §5.4. Done when npm run seed && npm test passes.
```

**Phase 3: Engines and golden numbers**
```
Read BUILD_SPEC §6. Implement lib/engines (costEngine, gives, givegetEngine, negotiation), lib/settings.ts and lib/format.ts (lakh/crore/rupee formatting and rounding rules in §6.6). Write tests/engines.test.ts and tests/golden.test.ts asserting every row of the §6.6 table to ±0.005 lakh, plus format tests (₹11.6 lakh, ₹1.8 crore, ₹22,000). Done when all tests pass.
```

**Phase 4: Dashboard and inbox**
```
Read BUILD_SPEC §8.2–§8.3 and match 04-dashboard-main.png, 02-…png and 03-…png. Build the dashboard cards and the redline inbox from seed data and engines. Done when every number on screen comes from data/engines, the north-star KPI reads 62%, and clicking CloudDesk opens its board.
```

**Phase 5: Negotiation board: changes and price tags**
```
Read BUILD_SPEC §7.1, §8.4 and §9. Build the store, the board header and step indicator, the Changes tab with /api/sort (live + cached fixture + AI badge), and the Price tags tab with proof, confidence and the "See the contracts" drawer. Done when the board shows ₹4.5 / ₹3.2 / ₹3.8 lakh and ₹11.6 lakh total, with and without an API key.
```

**Phase 6: Packages, approvals, legal**
```
Read BUILD_SPEC §6.4, §8.4 (Packages), §8.5, §8.6. Build the Packages tab, the business-owner approval card, the finance check and the legal queue, all wired to the store and role switcher. Done when A/B/C show ₹11.6 / ₹10.5 / ₹6.9 lakh, finance only sees package A, and approving moves status to approved.
```

**Phase 7: Supplier portal, counter, signing**
```
Read BUILD_SPEC §7.2, §8.7, §6.5. Build the supplier portal (no ₹ anywhere), /api/reasons with fixture, the counter banner on the board, and the Signing tab. Done when picking B with a 7% counter shows ₹1.1 lakh on the board, accepting leads to "3 of 3 lines enforceable", ₹9.4 lakh protected, ₹9.2 lakh net, and the dashboard north star updates to 66% after "Send for signature".
```

**Phase 8: Ask panel**
```
Read BUILD_SPEC §7.3 and match 07-asksirion-panel.png. Build the docked Ask panel and /api/ask with the four tools running the real engines, the agent loop, guards and fixtures. Done when the three suggested questions answer correctly in live and cached mode (15-day what-if = ₹2.4 lakh, pooled, 27 companies), and a supplier-role request is refused.
```

**Phase 9: Insights, story, demo guide, polish**
```
Read BUILD_SPEC §8.1, §8.8, §8.9, §13. Build /insights, render content/story.md on /story with a table of contents, add the demo guide with steps 1–9 and reset, check mobile layout, empty states, loading states and keyboard focus. Done when the full §13 script runs start to finish in under 3.5 minutes with no API key.
```

**Phase 10: Deploy**
```
Read BUILD_SPEC §12. Make sure npm run build passes, no secrets are in the repo, and maxDuration is set on AI routes. Then walk me through pushing to GitHub and importing into Vercel, step by step.
```

---

## 12. Deploy to Vercel

1. **Before you push:** `npm run build` and `npm test` pass. `.env.local` is not committed. `docs/design-reference/` is in `.gitignore`.
2. **GitHub:** create a repository (private is safer, because the story mentions Sirion) and push `main`.
3. **Vercel:** sign in with GitHub → **Add New → Project** → import the repo. Vercel detects Next.js; keep the defaults.
4. **Environment variables** (Project → Settings → Environment Variables, for Production and Preview):
    - `ANTHROPIC_API_KEY` = your key
    - `DEMO_MODE` = `live` (switch to `cached` before a high-stakes presentation if you want zero risk)
    - `MODEL_FAST` = `claude-haiku-5-5`
    - `MODEL_SMART` = `claude-sonnet-5-5`
5. **Deploy.** Every push to `main` redeploys; other branches get preview URLs.
6. **Function time:** Vercel functions on Fluid compute default to 300 s on all plans, and Hobby's maximum is also 300 s. Our AI routes set `maxDuration = 60` and time out at 20 s, so this is plenty.
7. **Smoke test on the live URL:** run the §13 script once in live mode and once with `DEMO_MODE=cached`. Check Vercel → Logs for errors.
8. **Cost guard:** keep `max_tokens` caps, set a monthly spend limit on your Anthropic account, and remember that cached mode costs nothing.
9. **Share:** the production URL is what the assignment asks for. Optionally add a short custom domain.

---

## 13. Demo script (about 3 minutes)

| Step | Time | Role | Action | Viewer sees |
| --- | --- | --- | --- | --- |
| 1 | 0:00 | Lead | Open the inbox and click CloudDesk | "6 changes, 3 money lines, ₹11.6 lakh a year at stake" |
| 2 | 0:15 | Lead | Changes tab → Sort | 2 harmless approved and logged; 1 sent to legal; 3 money lines |
| 3 | 0:30 | Lead | Price tags tab | ₹4.5 / ₹3.2 / ₹3.8 lakh with proof; open one drawer |
| 4 | 1:00 | Lead | Ask: "What if we accept a 15-day claim window?" → Packages tab → Send for approval | ₹2.4 lakh (pooled, 27 companies); packages A/B/C |
| 5 | 1:30 | Owner, then Finance | Approve; finance approves A | B's give is under the limit |
| 6 | 1:50 | Supplier | Portal: pick B, suggest a 7% cap | No ₹ shown to the supplier |
| 7 | 2:15 | Lead | Accept the counter | ₹1.1 lakh, inside the ₹1.5 lakh range |
| 8 | 2:30 | Lead | Signing tab → Send for signature | 3 of 3 enforceable; ₹9.4 lakh protected, ₹9.2 lakh net; north star 62% → 66% |
| 9 | 2:50 | Lead | Insights | Predicted vs actual, one miss flagged |

---

## 14. Out of scope for the prototype

- Real Word file upload and diffing. The redline is pre-loaded. A stretch goal is two-file `.docx` upload with mammoth + diff, behind a "Try your own" button.
- Real Sirion, ERP or helpdesk integrations. All are mocked.
- Logins and real multi-user sync. The role switcher plus localStorage is enough.
- A supplier-side chatbot. This is deliberate (privacy).
- Any live pooled data. The pooled figures are fixtures.

## 15. Sources used for this spec

- Vercel function limits: https://vercel.com/docs/functions/limits and https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute
- Claude Code memory and CLAUDE.md: https://code.claude.com/docs/en/memory
- Product brief: "Cost of Yes: detailed brief for the Sirion assignment" (Claude doc, 18 Nov 2026)

---

## 16. Revision 1 (review feedback)

These changes supersede the matching parts of §6–§8 and §13. Golden numbers in §6.6 are unchanged.

1. **Headline wording.** Price tags and the ₹11.6 lakh total are labelled "estimated annual exposure vs procurement benchmarks". Each price tag shows current wording / supplier asks / benchmark used. The cost of accepting the redline vs the current contract is shown alongside: renewal ₹3.4 lakh, credits ₹3.2 lakh, price ₹6.6 lakh, total **₹13.26 lakh** (`redlinePriceTags().vsCurrentLakh`, tested).
2. **Package decision.** Above the cards: "A nets an estimated ₹1.3 lakh a year more than B and requires a three-year commitment (₹1.8 crore)". A "Must retain annual exit" preference (store `keepAnnualExit`) moves the recommendation to B (`recommendPackage`, tested). The value of flexibility is stated as unpriced.
3. **Front door.** The dashboard opens with a CloudDesk card and one button, "Review supplier changes". CloudDesk's ₹ figure and change groups stay hidden on the dashboard, inbox and board header until the changes are sorted. The disabled "Create dashboard" button is removed.
4. **Claim-window what-if on the credits card.** 10 days / 15 days / 30 days auto-filed / automatic, side by side with the supplier's ask, with cohort, source and confidence. "Use as draft counteroffer" saves it (`creditDraft`) and the Packages tab compares it with package B.
5. **First invoice check (simulated).** After signing: signed clause S1, January 2027 uptime 98.9% vs 99.5%, credit expected ₹25,000 (5% of the ₹5 lakh monthly fee per full 0.5% short), found ₹0, dispute owned by the procurement lead (`data/first_invoice_check.json`, `firstInvoiceCheck`, tested). The north star is renamed "Signed commercial terms with an automated check". Estimated value protected and actual credits recovered are shown as separate measures.
6. **Smaller changes.** After sorting, routine edits collapse into one row and the credits change comes first. The Ask panel is closed by default so the price-tag cards get the width; "Ask about this estimate" on each card opens it with that question (cached answers exist for all three lines).
7. **Demo script** is now 10 steps, ending with the invoice check (see README). Insights is linked from the guide as "Afterwards".

## 17. Revision 2: every redline is interactive

Supersedes "display-only redlines" in §5.6 and the single-negotiation state in §9.

1. **Data.** `redlines.json` now has clause-level changes for all six redlines (same harmless / legal / money mix as the §5.6 summary table) and a `slug` for the supplier portal. `service_events.json` adds 12 months for each of the 15 non-software contracts (480 rows; the 300 software rows are unchanged). BrightStaff's fee is pinned at ₹30 lakh. Eight pooled rows were added for the wording groups these redlines need. ₹ at stake is now computed, not hand-entered.
2. **Engines.** Every input follows own (n ≥ 8, same supplier type) → pooled (20+ companies) → not enough history. Renewal overspend for non-software types uses the software figure as a labelled assumption. Lines a supplier did not change keep today's wording. Packages drop gives that don't apply, drop trades that protect nothing, and add a no-give "Hold firm" package (id D) when fewer than two trades remain. Ties in net value go to the package with less commitment. Counters are one step softer than the package's wording on a changed line. CloudDesk's golden numbers are unchanged.
3. **State.** The store holds one negotiation per redline. CloudDesk starts as received; the other five start sorted (and priced if they have money lines). The demo guide follows CloudDesk only.
4. **Screens.** Inbox, board, approvals (all redlines), finance (all multi-year commitments), legal queue (all legal changes after sorting), supplier portal (`/portal`, `/portal/[slug]`). Counters can be accepted or declined. Redlines with legal changes only sign once legal has decided every change. The north star adds each signed deal's checkable lines.
5. **AI.** Sort fixtures exist for every redline (`sort_fixtures.json`). Cached Ask answers for non-CloudDesk redlines are built from the same tool outputs the live assistant uses. The reason writer is told which supplier it is writing for.

## 18. Revision 3: first-time users

The user's question throughout: “CloudDesk wants to change our renewal terms. Which changes should I accept, and what should I ask for in return?”

1. **Entry.** One-click “Continue as Riya Kapoor” stands in for company SSO (`SignInGate`). First visit shows a welcome panel (who you are, what you are deciding, one button, “Fictional demo data”) beside **How this workspace uses data**. Opening any redline makes the user “returning”: the dashboard then shows the CloudDesk task and a work queue with whose turn it is on every redline.
2. **Data settings.** `usePeerBenchmarks` (default on) and `contributeOutcomes` (default off). Peer benchmarks off makes `pooledUsable` false in the engines, so pooled-only estimates become “Insufficient data to estimate”; CloudDesk's own-data numbers are unchanged (tested). The assistant receives the setting too.
3. **Changes.** “Analyse six changes” replaces “Sort changes”. Each change has a plain-English sentence (`plain` in `redlines.json`); the clause diff is one click away and labelled current signed contract / proposed renewal.
4. **Financial impact** (was Price tags) leads with the cost vs the current contract (₹13.3 lakh), benchmark exposure underneath. Cards separate “Used to calculate this estimate” from “Peer comparison · not used in this number”. The claim-window what-if starts on the supplier's proposal and reveals the comparison only after a choice.
5. **Compare offers** (was Packages). Offers are framed as trade-offs (commit for three years, pay 15 days sooner, offer more time to claim credits, hold firm), with what you give, what the supplier gives back and who approves. A saved draft can become offer E (`draftOfferTemplate`): hold firm on the other lines, concede the tested claim window. New wording S4 (15-day manual claim) is not checkable automatically, and the offer says so.
6. **Handoffs.** A sticky next-step panel (`lib/nextStep.ts`) replaces the status banner: whose turn, what they decide, what happens next, one primary button. It offers “Preview what CloudDesk will see” before sending and “View as …” shortcuts for the demo. The progress tracker only shows progress; the demo guide sits behind “Walk me through the demo”.
7. **Ending.** The invoice check states the outcome in one sentence, shows the signed clause and the invoice side by side, and labels the gap “Credit flagged for follow-up”. The north star is “Signed commercial terms with an automated check”.

## 19. Revision 4: visual redesign

Supersedes §4 (design system) where they differ.

1. **Tokens** (`app/globals.css`): canvas `#F5F7FA`, white surfaces, ink `#172B3A`, secondary `#465B68`, dividers `#D6DFE5`, primary teal `#005D68`; blue `agreement` for the current agreement, amber `proposed` for the supplier’s change, green `positive` for confirmed outcomes (always with a text label). 8 px panels, 1 px borders, elevation only for floating menus and drawers. Inter; page titles 28 px/600, section titles 16–18 px/600, body 14 px, metadata 12–13 px, tabular numerals.
2. **Shell**: 56 px header (product, workspace, working search with keyboard support and `/` shortcut, demo role switcher, notifications for the viewed role, Help menu with the walkthrough, account menu). Labelled left navigation (Overview, Negotiations, Insights; About this demo below), icon rail on tablets, bottom bar on phones.
3. **Account**: `profile` in the store (full name, preferred name, job title), `/profile` page with validation, Save/Cancel and a “Profile updated” confirmation; `/workspace` for data access, kept separate. Initials, greetings, the sign-in button and the invoice follow-up owner read from the profile; permissions never do.
4. **Overview**: active-task panel first (scenario copy on first visit, then the stage heading: Review financial impact, Review supplier counteroffer, Check first invoice…), other negotiations beside it, a KPI strip, horizontal exposure bars and stacked credits recovered vs missed. Notice deadlines and wording mix moved to Insights.
5. **Negotiation**: one stepper (Review changes → Financial impact → Compare offers → Approval & supplier → Sign & check) replaces the tracker and tabs; the status strip carries the single primary action. Changes show practical effect above aligned document columns. Financial impact leads with the cost vs the current contract at the largest size, then one row per clause (request, effect, basis, Evidence drawer), then Explore alternatives. Offers are a comparison table. The assistant names the document it is answering about.
6. **Wording**: “Insufficient internal history to estimate” wherever peer data would be needed and is off; “Save to draft offer” / “View my draft”; “Preview supplier view”; “Credit flagged for follow-up”.
