'use client';

import { useEffect } from 'react';
import { ArrowRight, Check, FileEdit, Send, ShieldCheck, Star } from 'lucide-react';
import { Button, EmptyState, StatusPill } from '@/components/ui';
import { getContract } from '@/lib/data';
import { priceTag } from '@/lib/engines/costEngine';
import { breaksAnnualExit, recommendPackage } from '@/lib/engines/givegetEngine';
import { CLAIM_CHOICE_LABEL, formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { atLeast, useDemo } from '@/lib/store';
import type { Line, PricedPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

const LINES: Line[] = ['renewal', 'credits', 'price'];

export function PackagesTab({ packages }: { packages: PricedPackage[] }) {
  const status = useDemo((s) => s.status);
  const sortResult = useDemo((s) => s.sortResult);
  const selected = useDemo((s) => s.selectedPackages);
  const toggle = useDemo((s) => s.togglePackage);
  const viewPackages = useDemo((s) => s.viewPackages);
  const sendForApproval = useDemo((s) => s.sendForApproval);
  const financeDecision = useDemo((s) => s.financeDecision);
  const keepAnnualExit = useDemo((s) => s.keepAnnualExit);
  const setKeepAnnualExit = useDemo((s) => s.setKeepAnnualExit);
  const creditDraft = useDemo((s) => s.creditDraft);
  const locked = atLeast(status, 'awaiting_approval');

  useEffect(() => {
    viewPackages();
  }, [viewPackages, status]);

  if (!sortResult) {
    return <EmptyState title="Sort the changes first">Packages are built from the price tags of the money lines.</EmptyState>;
  }

  const sorted = [...packages].sort((a, b) => a.id.localeCompare(b.id));
  const rec = recommendPackage(packages, { keepAnnualExit });
  const t = rec.tradeOff;

  // Draft counteroffer from the credits price tag: what a claim window leaves exposed vs a package that gets automatic credits.
  const cd = getContract('C-017');
  const draftTag = creditDraft ? priceTag(cd, 'credits', creditDraft) : undefined;
  const askTag = priceTag(cd, 'credits', 'claim_le_10');
  const autoPkg = packages.find((p) => p.id === 'B');

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-teal-900/30 bg-white px-6 py-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-wide text-muted">The decision</div>
            {t ? (
              <p className="mt-1 text-[17px] leading-snug text-teal-title">
                {t.committed.id} nets an estimated {formatLakh(t.netGapLakh)} a year more than {t.flexible.id} and requires a three-year commitment ({formatLakh(t.commitmentLakh)}).
              </p>
            ) : (
              <p className="mt-1 text-[17px] text-teal-title">Package {rec.recommended.id} nets the most.</p>
            )}
            <p className="mt-1 text-sm text-muted">
              Recommended: <strong className="font-medium text-ink">{rec.recommended.id} · {rec.recommended.name}</strong>
              {keepAnnualExit ? ' (keeps the annual exit).' : ' (highest net).'} The value of keeping an annual exit has not been priced yet, so weigh it yourself.
            </p>
          </div>
          <label className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', keepAnnualExit ? 'border-teal-900 bg-teal-900/5 text-teal-900' : 'border-line text-ink', locked ? 'opacity-60' : 'cursor-pointer')}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#0C5E69]"
              checked={keepAnnualExit}
              disabled={locked}
              onChange={(e) => setKeepAnnualExit(e.target.checked)}
            />
            Must retain annual exit
          </label>
        </div>
      </section>

      {draftTag && creditDraft && (
        <section className="flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-white px-6 py-4 text-sm shadow-card">
          <FileEdit className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" />
          <div className="flex-1">
            <div className="font-medium text-ink">
              Your draft counteroffer: {CLAIM_CHOICE_LABEL[creditDraft]}
              {creditDraft === 'claim_11_30' && <span className="font-normal text-muted"> (priced with the 11–30 day pooled cohort)</span>}
            </div>
            <p className="mt-0.5 text-muted">
              Leaves an estimated {formatLakh(draftTag.costLakh)} a year exposed on credits (vs {formatLakh(askTag.costLakh)} for CloudDesk’s 10 days).
              {autoPkg && <> Package {autoPkg.id} gets automatic credits instead ({formatLakh(0)} exposure) in exchange for paying {cd.paymentDays - 30} days faster, about {formatLakh(autoPkg.giveCostLakh)} a year.</>}
            </p>
          </div>
        </section>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        {sorted.map((p) => {
          const on = selected.includes(p.id);
          const rejected = p.id === 'A' && financeDecision?.A === 'rejected';
          const isRec = rec.recommended.id === p.id;
          const breaksExit = breaksAnnualExit(p);
          return (
            <article
              key={p.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-6 shadow-card transition-opacity',
                on && !rejected ? 'border-teal-900/40' : 'border-line opacity-60',
              )}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted">Package {p.id} · #{p.rank} by net</div>
                  <h3 className="text-[17px] text-teal-title">{p.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {isRec && <StatusPill tone="teal"><Star className="h-3 w-3" /> Recommended</StatusPill>}
                    {breaksExit && <StatusPill tone={keepAnnualExit ? 'danger' : 'lime'}>No annual exit for 3 years</StatusPill>}
                  </div>
                </div>
                <label className={cn('flex items-center gap-2 text-xs', locked ? 'text-muted' : 'cursor-pointer text-ink')}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#0C5E69]"
                    checked={on}
                    disabled={locked}
                    onChange={() => toggle(p.id)}
                    aria-label={`Offer package ${p.id}`}
                  />
                  Offer
                </label>
              </header>

              <div className="mt-4 text-[30px] font-light leading-none text-teal-900">{formatLakh(p.protectedLakh)}</div>
              <div className="text-sm text-muted">a year protected vs CloudDesk’s redline · net {formatLakh(p.netLakh)}</div>
              {p.commitmentLakh > 0 && <div className="mt-1 text-xs font-medium text-ink">Commitment: {formatLakh(p.commitmentLakh)} over 3 years</div>}

              <div className="mt-5">
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">We give</div>
                <ul className="space-y-1 text-sm">
                  {p.gives.map((g) => (
                    <li key={g.id} className="flex items-start justify-between gap-2">
                      <span>{g.label}</span>
                      <span className="shrink-0 text-muted">
                        {g.commitmentLakh ? `${formatLakh(g.commitmentLakh)} commitment` : g.cashCostLakh ? `${formatLakh(g.cashCostLakh)}/yr` : 'no cash cost'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">We get</div>
                <ul className="space-y-1 text-sm">
                  {LINES.map((l) => (
                    <li key={l} className="flex items-start justify-between gap-2">
                      <span><span className="text-muted">{LINE_LABEL[l]}:</span> {GROUP_LABEL[p.wordings[l]]}</span>
                      <span className="shrink-0 tabular-nums text-teal-900">{formatLakh(p.protectedByLine[l])}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <footer className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <span className="text-xs text-muted">Approvals:</span>
                {p.approvals.map((a) => (
                  <StatusPill key={a} tone={a === 'finance' ? 'lime' : 'mint'}>{a === 'lead' ? 'Lead' : 'Finance'}</StatusPill>
                ))}
                {rejected && <StatusPill tone="danger">Rejected by finance</StatusPill>}
              </footer>
            </article>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        {locked ? (
          <div className="flex items-center gap-2 text-sm text-teal-900">
            <ShieldCheck className="h-4 w-4" />
            {status === 'awaiting_approval' ? 'Sent for approval. Waiting on the business owner' + (selected.includes('A') ? ' and finance.' : '.') : 'Approved packages are locked.'}
          </div>
        ) : (
          <div className="text-sm text-muted">
            Offering {selected.length} package{selected.length === 1 ? '' : 's'}: {selected.join(', ')}.{' '}
            {selected.includes('A') ? 'Package A needs finance (3-year commitment).' : 'No finance step needed.'}
          </div>
        )}
        {!locked ? (
          <Button onClick={sendForApproval}>
            <Send className="h-4 w-4" /> Send for approval
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Check className="h-4 w-4" /> Sent <ArrowRight className="h-3.5 w-3.5" /> approvals
          </span>
        )}
      </div>
    </div>
  );
}
