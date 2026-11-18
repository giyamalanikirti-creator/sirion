# Cost of Yes: working rules

Spec: `docs/BUILD_SPEC.md`. If code and spec disagree, the spec wins until it is updated.

- **Numbers from code.** `lib/engines/*` compute every figure from `data/*.json`. The LLM never returns a number shown to users unless it came from a tool result (`lib/server/ask.ts` rejects answers quoting ₹ figures that no tool returned).
- **Golden numbers.** §6.6 values are asserted in `tests/golden.test.ts` to ±0.005 lakh. Run `npm test` after touching engines or data.
- **Demo-safe.** Every AI route returns `source: "live" | "cached"` and falls back to `data/fixtures/*` on any failure, when `DEMO_MODE=cached`, or with no key.
- **Brand.** Sirion-style look, our own name and mark. No Sirion logo. Disclaimer in the sidebar and on `/story`. `docs/design-reference/` stays out of git.
- **Privacy.** The supplier portal never shows ₹ figures, pooled numbers or internal notes. Supplier-facing text passes `isSupplierSafe` in `lib/schemas.ts`.
- **Fictional data.** All suppliers, people and numbers are invented. Regenerate seed data with `npm run seed` (deterministic, seed 2026).
