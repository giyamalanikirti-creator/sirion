'use client';

import { useEffect } from 'react';
import { AlertTriangle, Check, FileEdit, Plus, ShieldCheck, Star } from 'lucide-react';
import { Button, EmptyState, StatusPill } from '@/components/ui';
import { getContract, getRedline, wordingLibrary } from '@/lib/data';
import { priceTag } from '@/lib/engines/costEngine';
import { breaksAnnualExit, recommendPackage } from '@/lib/engines/givegetEngine';
import { CLAIM_CHOICE_LABEL, formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { offersFor } from '@/lib/offers';
import { atLeast, financePackages, useDemo } from '@/lib/store';
import type { Contract, PricedPackage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';
import type { BoardTab } from './NextStepPanel';

/** Each offer framed as the business trade-off the lead is making. */
export function offerTitle(p: PricedPackage, c: Contract): string {
  const g = p.gives.map((x) => x.id);
  if (g.includes('term_3y')) return 'Commit for three years';
  if (g.includes('payment_30')) return `Pay ${c.paymentDays - 30} days sooner`;
  if (g.includes('claim_30_autofiled')) return 'Offer more time to claim credits';
  if (g.includes('notice_60')) return 'Accept 60 days’ notice on renewal';
  if (p.id === 'E') return 'Your counter';
  return 'Hold firm';
}

export function PackagesTab({ onGoTab }: { onGoTab?: (t: BoardTab) => void }) {
  const { id, n, togglePackage: toggle, viewPackages, setKeepAnnualExit } = useBoard();
  const addDraftOffer = useDemo((s) => s.addDraftOffer);
  const { status, sortResult, selectedPackages: selected, financeDecision, keepAnnualExit, creditDraft } = n;
  const redline = getRedline(id);
  const c = getContract(redline.contractId);
  const packages = offersFor(id, n);
  const needFinance = financePackages(id, selected);
  const locked = atLeast(status, 'awaiting_approval');

  useEffect(() => {
    viewPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  if (!sortResult) return <EmptyState title="Analyse the changes first">Offers are built from the financial impact of the commercial changes.</EmptyState>;
  if (!packages.length) return <EmptyState title="Nothing to offer">This redline has no commercial changes, so there is nothing to trade. Legal handles its changes.</EmptyState>;

  const sorted = [...packages].sort((a, b) => a.id.localeCompare(b.id));
  const rec = recommendPackage(packages, { keepAnnualExit });
  const t = rec.tradeOff;
  const tie = packages.find((p) => p.id !== rec.recommended.id && Math.abs(p.netLakh - rec.recommended.netLakh) <= 0.005 && p.commitmentLakh > 0);

  // The lead's saved what-if: which offers already include it, and what it would leave exposed.
  const askCredits = redline.changes.find((ch) => ch.expected.line === 'credits')?.expected.wordingGroup;
  const draftTag = creditDraft && askCredits ? priceTag(c, 'credits', creditDraft) : undefined;
  const askTag = askCredits ? priceTag(c, 'credits', askCredits) : undefined;
  const includes = creditDraft ? packages.filter((p) => p.lines.includes('credits') && p.wordings.credits === creditDraft) : [];
  const autoOffer = packages.find((p) => p.wordings.credits === 'automatic' && p.gives.some((g) => g.id === 'payment_30'));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-teal-900/30 bg-white px-6 py-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-wide text-muted">The decision</div>
            <p className="mt-1 text-[17px] leading-snug text-teal-title">
              {t
                ? `${t.committed.id} protects an estimated ${formatLakh(t.netGapLakh)} a year more than ${t.flexible.id} and requires a three-year commitment (${formatLakh(t.commitmentLakh)}).`
                : tie
                  ? `${rec.recommended.id} and ${tie.id} protect the same estimated ${formatLakh(tie.netLakh)} a year; ${tie.id} also needs a three-year commitment (${formatLakh(tie.commitmentLakh)}).`
                  : `Offer ${rec.recommended.id} protects the most.`}
            </p>
            <p className="mt-1 text-sm text-muted">
              Recommended: <strong className="font-medium text-ink">{rec.recommended.id} · {offerTitle(rec.recommended, c)}</strong>
              {keepAnnualExit ? ' (keeps the annual exit).' : ' (highest net value).'} The value of keeping an annual exit has not been priced, so weigh it yourself.
            </p>
          </div>
          <label className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', keepAnnualExit ? 'border-teal-900 bg-teal-900/5 text-teal-900' : 'border-line text-ink', locked ? 'opacity-60' : 'cursor-pointer')}>
            <input type="checkbox" className="h-4 w-4 accent-[#0C5E69]" checked={keepAnnualExit} disabled={locked} onChange={(e) => setKeepAnnualExit(e.target.checked)} />
            Must retain annual exit
          </label>
        </div>
      </section>

      {creditDraft && draftTag && askTag && (
        <section id="my-draft" className="rounded-2xl border border-periwinkle/50 bg-white px-6 py-4 text-sm shadow-card">
          <div className="flex flex-wrap items-start gap-3">
            <FileEdit className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink">Your draft counter: {CLAIM_CHOICE_LABEL[creditDraft]}</div>
              <p className="mt-0.5 text-muted">
                {Number.isFinite(draftTag.costLakh)
                  ? `Leaves an estimated ${formatLakh(draftTag.costLakh)} a year exposed on credits, vs ${formatLakh(askTag.costLakh)} for ${redline.supplier}’s proposal.`
                  : 'Insufficient data to estimate what it leaves exposed.'}
                {autoOffer && ` Offer ${autoOffer.id} gets automatic credits instead (₹0 exposure) for paying ${c.paymentDays - 30} days sooner, about ${formatLakh(autoOffer.giveCostLakh)} a year.`}
                {!wordingLibrary.find((w) => w.line === 'credits' && w.wordingGroup === creditDraft)?.enforceable &&
                  ' A manual claim window still relies on someone filing in time, so Sirion could not check it automatically.'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {includes.length ? (
                  <span className="flex items-center gap-1.5 text-teal-900"><Check className="h-4 w-4" /> Included in offer {includes.map((p) => p.id).join(', ')}</span>
                ) : (
                  <>
                    <span className="text-muted">Not in any offer yet.</span>
                    <Button size="sm" variant="outline" onClick={() => addDraftOffer(id)} disabled={locked}>
                      <Plus className="h-3.5 w-3.5" /> Add it as offer E
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => onGoTab?.('tags')}>Change the draft</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={cn('grid gap-4', sorted.length >= 3 ? 'xl:grid-cols-3' : 'lg:grid-cols-2')}>
        {sorted.map((p) => {
          const on = selected.includes(p.id);
          const rejected = financeDecision === 'rejected' && p.approvals.includes('finance');
          const isRec = rec.recommended.id === p.id;
          const breaksExit = breaksAnnualExit(p);
          const unchecked = p.lines.filter((l) => !wordingLibrary.find((w) => w.line === l && w.wordingGroup === p.wordings[l])?.enforceable);
          return (
            <article
              key={p.id}
              id={p.id === 'E' ? 'offer-E' : undefined}
              className={cn('flex flex-col rounded-2xl border bg-white p-6 shadow-card transition-opacity', on && !rejected ? 'border-teal-900/40' : 'border-line opacity-60')}
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted">Offer {p.id} · #{p.rank} by net value</div>
                  <h3 className="text-[17px] text-teal-title">{offerTitle(p, c)}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {isRec && <StatusPill tone="teal"><Star className="h-3 w-3" /> Recommended</StatusPill>}
                    {breaksExit && <StatusPill tone={keepAnnualExit ? 'danger' : 'lime'}>No annual exit for 3 years</StatusPill>}
                    {p.id === 'E' && <StatusPill tone="periwinkle">From your draft</StatusPill>}
                  </div>
                </div>
                <label className={cn('flex items-center gap-2 text-xs', locked ? 'text-muted' : 'cursor-pointer text-ink')}>
                  <input type="checkbox" className="h-4 w-4 accent-[#0C5E69]" checked={on} disabled={locked} onChange={() => toggle(p.id)} aria-label={`Offer ${p.id}`} />
                  Include
                </label>
              </header>

              <div className="mt-4 text-[28px] font-light leading-none text-teal-900">{formatLakh(p.protectedLakh)}</div>
              <div className="text-sm text-muted">a year protected vs {redline.supplier}’s proposal · net {formatLakh(p.netLakh)}</div>

              <div className="mt-5">
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">You give</div>
                <ul className="space-y-1 text-sm">
                  {p.gives.map((g) => (
                    <li key={g.id} className="flex items-start justify-between gap-2">
                      <span>{g.label}</span>
                      <span className="shrink-0 text-muted">
                        {g.commitmentLakh ? `${formatLakh(g.commitmentLakh)} commitment` : g.cashCostLakh ? `${formatLakh(g.cashCostLakh)}/yr` : 'no cash cost'}
                      </span>
                    </li>
                  ))}
                  {p.concession && <li>{p.concession[0].toUpperCase() + p.concession.slice(1)}</li>}
                  {!p.gives.length && !p.concession && <li className="text-muted">Nothing. You ask {redline.supplier} to drop its changes.</li>}
                </ul>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">{redline.supplier} gives back</div>
                <ul className="space-y-1 text-sm">
                  {p.lines.map((l) => (
                    <li key={l} className="flex items-start justify-between gap-2">
                      <span><span className="text-muted">{LINE_LABEL[l]}:</span> {GROUP_LABEL[p.wordings[l]]}</span>
                      <span className="shrink-0 tabular-nums text-teal-900">{formatLakh(p.protectedByLine[l])}</span>
                    </li>
                  ))}
                </ul>
                {unchecked.length > 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {unchecked.map((l) => LINE_LABEL[l]).join(', ')}: no automated check after signing
                  </p>
                )}
              </div>
              <footer className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <span className="text-xs text-muted">Who must approve:</span>
                <StatusPill tone="mint">You</StatusPill>
                <StatusPill tone="mint">{c.businessOwner} (business owner)</StatusPill>
                {p.approvals.includes('finance') && <StatusPill tone="lime">Finance</StatusPill>}
                {rejected && <StatusPill tone="danger">Rejected by Finance</StatusPill>}
              </footer>
            </article>
          );
        })}
      </div>

      <p className="flex items-center gap-2 px-1 text-sm text-muted">
        {locked ? <ShieldCheck className="h-4 w-4 text-teal-900" /> : null}
        {locked
          ? 'Offers are locked once they are sent for approval.'
          : `Including ${selected.length === 1 ? 'offer' : 'offers'} ${selected.join(', ')}. ${needFinance.length ? `Offer ${needFinance.join(', ')} also needs Finance (three-year commitment).` : 'No Finance step needed.'} Use the button at the top to send them for approval.`}
      </p>
    </div>
  );
}
