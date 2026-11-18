# Cost of Yes

**Every supplier redline has a price. Cost of Yes shows it before anyone says yes.**

Cost of Yes is a concept for the **negotiation** stage of the contract lifecycle. When a supplier sends back a renewal with changes, it sorts the changes, puts a ₹ price tag on every money line with proof, builds give-get packages, routes approvals, lets the supplier choose in a portal, and makes sure every money line that gets signed can be checked by a system afterwards.

## Why this stage

Most contract tools are strongest before negotiation (templates, clause libraries) and after signature (obligations, renewals, invoices). The negotiation round in between is where value quietly leaks:

- A supplier redline mixes harmless edits (an address, a capital letter) with changes that cost real money (a longer notice period, a claim window for service credits, an uncapped price rise).
- Under time pressure, the team reads the redline as text, not as money. "90 days' notice" looks like a small edit.
- Once signed, the wording decides what can be enforced. A credit that must be claimed in writing within 10 days is, in practice, a credit that is rarely paid.

The negotiation stage is the last moment where the company can change the wording cheaply. After signature, the same fix costs a renewal cycle.

## The problem

In the demo, CloudDesk (a fictional helpdesk software supplier on a ₹60 lakh a year, 500-seat contract) returns its renewal with six changes:

| # | Clause | Change | What it really is |
|---|---|---|---|
| 1 | 18.2 Notices | New office address | Harmless |
| 2 | 1.1 Definitions | "effective date" → "Effective Date" | Harmless |
| 3 | 12.1 Liability | Cap from 12 to 6 months of fees | Legal |
| 4 | 3.2 Renewal | Notice from 30 to 90 days | Money: about ₹4.5 lakh a year |
| 5 | 7.4 Service credits | Automatic → claim in writing within 10 days | Money: about ₹3.2 lakh a year |
| 6 | 9.1 Fees | Fixed → supplier may revise yearly | Money: about ₹3.8 lakh a year |

Saying yes to all six would cost about **₹11.6 lakh a year, 19% of the fee**, and three of the six lines would end up with wording no system can check.

The people involved each see only part of this:

- The **procurement lead** owns the redline but has no fast way to price wording.
- The **business owner** wants the tool renewed without fuss.
- **Finance** cares about commitments and cash, not clause text.
- **Legal** cares about liability and should not hold up commercial lines.
- The **supplier** wants a deal and a reason it can accept.

## Stakeholder map

| Stakeholder | What they need | What Cost of Yes gives them | What they never see |
|---|---|---|---|
| Procurement lead (main user) | Know what each change costs, and what to trade | Sorted changes, price tags with proof, ranked packages, an assistant that calculates | n/a |
| Business owner | A quick yes or no | A short Teams-style card with three facts | Clause text |
| Finance | Control of commitments and cash | Only the gives that need them (over 1 year, or over ₹5 lakh a year) | Gives under the limit |
| Legal | Liability, IP, data, law | A queue with only legal changes; never blocks money lines | Money lines |
| Supplier | A fair deal and a reason | A menu of packages with plain reasons and one counter | ₹ figures, costs, pooled data, internal notes |
| Sirion (after signing) | Checkable wording | A tracker per money line from day one | n/a |

## How it works

1. **Sort.** A fast model sorts each change into harmless, legal or money, with a confidence score. Anything under 70% goes to a person. Harmless changes are approved and logged; legal changes go to legal.
2. **Price.** For each money line, the price engine compares the supplier's wording with a benchmark (opt-in renewal, automatic credits, a 5% price cap) using the company's own contract history:
   - *Renewal:* how often past renewals with this notice period went through unreviewed (5 of 12), times the average unused seats on those renewals (18%), times the fee.
   - *Credits:* how much of the credits owed were actually recovered under this wording (22% vs 94% for automatic), times the credits CloudDesk earned last year (₹4.5 lakh).
   - *Price:* the average year-two price rise under this wording (11%) vs under a 5% cap (4.6%), times the fee.
   - Confidence follows the sample size: 20+ contracts is high, 8–19 medium. Below 8, the engine uses pooled data from 20+ companies, or says "not enough history".
3. **Package.** The engine prices give-get packages: a 3-year term (Certainty), faster payment (Pay faster), or a middle ground on notice and claims (Meet halfway). Each shows what it protects, what the give costs, and which approvals it needs.
4. **Approve.** The business owner approves in one tap. Finance sees only the 3-year commitment (₹1.8 crore). Faster payment costs about ₹22,000 a year, under the ₹5 lakh limit, so it needs no finance step.
5. **Supplier menu.** CloudDesk sees the packages in plain words, each line with a reason written for them. No ₹ figures. It picks "Pay faster" and asks for a 7% cap instead of 5%.
6. **Counter.** The engine prices the counter at ₹1.1 lakh a year, inside the lead's ₹1.5 lakh range per line. The lead accepts.
7. **Sign.** All three money lines are enforceable and linked to a Sirion tracker: a renewal alert, a credit check on every invoice, and an invoice price check against the cap. About **₹9.4 lakh a year is protected, ₹9.2 lakh net** of the payment give.

The assistant ("Ask Cost of Yes") can only calculate and draft. Every number it says must come from a tool that runs the same engines as the screen, and it always says how many contracts a number rests on.

## Data and privacy

- **Own data:** contracts, invoices, service-level events and past renewals already in the contract system. In this prototype they are generated with a fixed seed so every number is reproducible.
- **Pooled data:** counts from other companies, used only when own history is thin. A pooled figure shows only with 20+ companies, a little noise is added, data is at least 6 months old, and companies opt in. A row with 14 companies is hidden ("Not enough companies yet").
- **The supplier never sees** ₹ figures, costs, pooled numbers or internal notes. The supplier-facing reason writer is checked so it cannot mention money or other customers, and there is no supplier-side chatbot.
- **AI is optional.** Every AI feature has a saved fallback, and the screen shows whether an answer is "AI: live" or "AI: cached". The numbers never come from the model.

## Success metrics

**North star: money lines enforceable at signing.** The share of signed money lines (renewal, credits, price) whose wording a system can check. In the demo it moves from 18 of 29 (62%) to 21 of 32 (66%) when CloudDesk signs.

Supporting metrics:

- **₹ protected per redline**, net of gives (CloudDesk: ₹9.2 lakh a year).
- **Rounds to sign**: fewer back-and-forth rounds when the supplier picks from a menu.
- **Time from redline to approval**: owner and finance approve from a card, not a document.
- **Prediction accuracy**: last year's price tags vs what happened. In the demo, 5 of 6 landed within 25%; HelpHub's renewal was 33% under and is flagged for review.
- **Guardrails:** supplier satisfaction with the process, and no ₹ leakage to suppliers.

## Assumptions

- The company has at least a year of contract, invoice and service-level history in its contract system.
- Benchmarks (opt-in renewal, automatic credits, 5% cap) are set by the procurement team and can change.
- Claims filed automatically by the contract system recover about 90% of credits. This is an assumption and is labelled as one.
- Suppliers with a 7% cap price close to the cap, like those with a 5% cap do (about 92% of the cap).
- Cost of money is 9% a year; finance reviews gives over ₹5 lakh a year or commitments over 1 year; the lead can accept up to ₹1.5 lakh a year per line.
- Redlines arrive as tracked changes that can be parsed into clause-level changes. The prototype pre-loads one.

## Sources

- All suppliers, people and numbers in this prototype are **fictional** and generated for the demo (`data/` in the repository).
- Design is in the style of Sirion's public product screenshots, with our own name and mark. This is not a Sirion product and is not endorsed by Sirion.
- Vercel function limits: [vercel.com/docs/functions/limits](https://vercel.com/docs/functions/limits)
- Product brief: "Cost of Yes: detailed brief for the Sirion assignment" (18 Nov 2026).
