'use client';

import { useEffect } from 'react';
import { AlertTriangle, Check, FileEdit, Plus, Star } from 'lucide-react';
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

/** Each offer as the plain business trade-off the buyer is making. */
export function offerTitle(p: PricedPackage, c: Contract): string {
  const g = p.gives.map((x) => x.id);
  if (g.includes('term_3y')) return 'Commit for three years';
  if (g.includes('payment_30')) return `Pay ${c.paymentDays - 30} days sooner`;
  if (g.includes('claim_30_autofiled')) return 'Offer more time to claim credits';
  if (g.includes('notice_60')) return 'Accept 60 days’ notice on renewal';
  if (p.id === 'E') return 'Your draft offer';
  return 'Hold firm';
}

const checkable = (line: string, group: string) => !!wordingLibrary.find((w) => w.line === line && w.wordingGroup === group)?.enforceable;

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

  const cols = [...packages].sort((a, b) => a.id.localeCompare(b.id));
  const rec = recommendPackage(packages, { keepAnnualExit });
  const t = rec.tradeOff;
  const tie = packages.find((p) => p.id !== rec.recommended.id && Math.abs(p.netLakh - rec.recommended.netLakh) <= 0.005 && p.commitmentLakh > 0);
  const lines = cols[0].lines;

  // The buyer's saved what-if: which offers include it, and what it leaves exposed.
  const askCredits = redline.changes.find((ch) => ch.expected.line === 'credits')?.expected.wordingGroup;
  const draftTag = creditDraft && askCredits ? priceTag(c, 'credits', creditDraft) : undefined;
  const askTag = askCredits ? priceTag(c, 'credits', askCredits) : undefined;
  const includes = creditDraft ? packages.filter((p) => p.lines.includes('credits') && p.wordings.credits === creditDraft) : [];
  const autoOffer = packages.find((p) => p.wordings.credits === 'automatic' && p.gives.some((g) => g.id === 'payment_30'));

  const rowHead = 'sticky left-0 z-10 w-[180px] min-w-[180px] bg-white px-5 py-3 text-left align-top text-[13px] font-semibold text-muted';
  const cell = (p: PricedPackage) => cn('min-w-[200px] px-4 py-3 align-top', unavailable(p) && 'opacity-45', rec.recommended.id === p.id && 'bg-teal-tint/40');
  const unavailable = (p: PricedPackage) => (keepAnnualExit && breaksAnnualExit(p)) || (financeDecision === 'rejected' && p.approvals.includes('finance'));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white px-6 py-5" aria-labelledby="decision">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[70ch]">
            <div className="text-[13px] font-medium text-muted">The trade-off</div>
            <h2 id="decision" className="mt-1 text-[22px] font-semibold leading-snug text-ink">
              {t
                ? `${t.committed.id} protects an estimated ${formatLakh(t.netGapLakh)} a year more than ${t.flexible.id}, but commits you to ${formatLakh(t.commitmentLakh)} over three years.`
                : tie
                  ? `${rec.recommended.id} and ${tie.id} protect the same ${formatLakh(tie.netLakh)} a year; ${tie.id} also commits you for three years (${formatLakh(tie.commitmentLakh)}).`
                  : `Offer ${rec.recommended.id} protects the most.`}
            </h2>
            <p className="mt-1.5 text-[14px] text-muted">
              Recommended: <strong className="font-semibold text-ink">{rec.recommended.id} · {offerTitle(rec.recommended, c)}</strong>
              {keepAnnualExit ? ', because you need to keep an annual exit.' : ', the highest net value.'} The value of keeping an annual exit has not been priced.
            </p>
          </div>
          <label className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-[14px]', keepAnnualExit ? 'border-teal-900 bg-teal-tint text-teal-900' : 'border-line text-ink', locked ? 'opacity-60' : 'cursor-pointer hover:bg-page-bg')}>
            <input type="checkbox" className="h-4 w-4 accent-[#005D68]" checked={keepAnnualExit} disabled={locked} onChange={(e) => setKeepAnnualExit(e.target.checked)} />
            We must keep an annual exit
          </label>
        </div>
      </section>

      {creditDraft && draftTag && askTag && (
        <section id="my-draft" className="rounded-lg border border-line bg-white px-5 py-4" aria-labelledby="draft-title">
          <div className="flex flex-wrap items-start gap-3">
            <FileEdit className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" />
            <div className="min-w-0 flex-1">
              <h2 id="draft-title" className="text-[16px] font-semibold text-ink">Your draft offer: {CLAIM_CHOICE_LABEL[creditDraft]}</h2>
              <p className="mt-0.5 max-w-[90ch] text-[14px] text-muted">
                {priced(draftTag.costLakh)
                  ? `Leaves an estimated ${formatLakh(draftTag.costLakh)} a year exposed on credits, vs ${formatLakh(askTag.costLakh)} for ${redline.supplier}’s proposal${draftTag.source === 'pooled' && draftTag.pooledBackup ? ` (11–30 day cohort, ${draftTag.pooledBackup.companies} participating companies, low confidence)` : ''}.`
                  : 'Insufficient internal history to estimate what it leaves exposed.'}
                {autoOffer && ` Offer ${autoOffer.id} gets automatic credits instead for paying ${c.paymentDays - 30} days sooner (about ${formatLakh(autoOffer.giveCostLakh)} a year).`}
                {!checkable('credits', creditDraft) && ' A manual claim window still relies on someone filing in time, so Sirion could not check it automatically.'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {includes.length ? (
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-positive"><Check className="h-4 w-4" /> Included as offer {includes.map((p) => p.id).join(', ')}</span>
                ) : (
                  <>
                    <span className="text-[14px] text-muted">Not in the comparison yet.</span>
                    <Button size="sm" onClick={() => addDraftOffer(id)} disabled={locked}><Plus className="h-3.5 w-3.5" /> Add to comparison as offer E</Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => onGoTab?.('tags')}>Change the draft</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-line bg-white" aria-label="Offer comparison">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line">
                <th className={cn(rowHead, 'pt-4')} scope="col"><span className="sr-only">Compare</span></th>
                {cols.map((p) => (
                  <th key={p.id} scope="col" className={cn(cell(p), 'pt-4 text-left font-normal')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] text-muted">Offer {p.id}</div>
                        <div className="text-[16px] font-semibold leading-snug text-ink">{offerTitle(p, c)}</div>
                      </div>
                      <label className={cn('flex items-center gap-1.5 text-[12px]', locked || unavailable(p) ? 'text-muted' : 'cursor-pointer text-ink')}>
                        <input type="checkbox" className="h-4 w-4 accent-[#005D68]" checked={selected.includes(p.id)} disabled={locked} onChange={() => toggle(p.id)} aria-label={`Include offer ${p.id}`} />
                        Include
                      </label>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rec.recommended.id === p.id && <StatusPill tone="teal"><Star className="h-3 w-3" /> Recommended</StatusPill>}
                      {keepAnnualExit && breaksAnnualExit(p) && <StatusPill tone="grey">Not available: no annual exit</StatusPill>}
                      {financeDecision === 'rejected' && p.approvals.includes('finance') && <StatusPill tone="danger">Rejected by Finance</StatusPill>}
                      {p.id === 'E' && <StatusPill tone="proposed">From your draft</StatusPill>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <th scope="row" className={rowHead}>Estimated annual value</th>
                {cols.map((p) => (
                  <td key={p.id} className={cell(p)}>
                    <div className="num text-[20px] font-semibold text-ink">{formatLakh(p.protectedLakh)}</div>
                    <div className="num text-[12px] text-muted">protected vs {redline.supplier}’s proposal · net {formatLakh(p.netLakh)}</div>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={rowHead}>Commitment</th>
                {cols.map((p) => (
                  <td key={p.id} className={cell(p)}>
                    {p.commitmentLakh > 0 ? (
                      <span className="num font-semibold text-proposed">{formatLakh(p.commitmentLakh)} over 3 years</span>
                    ) : (
                      <span className="text-muted">None · annual exit kept</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={rowHead}>What we give</th>
                {cols.map((p) => (
                  <td key={p.id} className={cell(p)}>
                    <ul className="space-y-1">
                      {p.gives.map((g) => (
                        <li key={g.id}>
                          {g.label}
                          <span className="num ml-1 text-[12px] text-muted">{g.cashCostLakh ? `· ${formatLakh(g.cashCostLakh)}/yr` : ''}</span>
                        </li>
                      ))}
                      {p.concession && <li>{p.concession[0].toUpperCase() + p.concession.slice(1)}</li>}
                      {!p.gives.length && !p.concession && <li className="text-muted">Nothing: we ask {redline.supplier} to drop its changes</li>}
                    </ul>
                  </td>
                ))}
              </tr>
              {lines.map((l) => (
                <tr key={l}>
                  <th scope="row" className={rowHead}>What we get · {LINE_LABEL[l].toLowerCase()}</th>
                  {cols.map((p) => (
                    <td key={p.id} className={cell(p)}>
                      <div className="text-ink">{GROUP_LABEL[p.wordings[l]]}</div>
                      <div className="num text-[12px] text-muted">
                        {p.protectedByLine[l] > 0.005 ? `${formatLakh(p.protectedByLine[l])} a year protected` : 'nothing protected'}
                        {!checkable(l, p.wordings[l]) && <span className="ml-1 text-danger">· no automated check</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row" className={rowHead}>Approval needed</th>
                {cols.map((p) => (
                  <td key={p.id} className={cell(p)}>
                    You and {c.businessOwner}{p.approvals.includes('finance') ? <span className="font-semibold text-proposed"> + Finance</span> : ''}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={rowHead}>Automated checks after signing</th>
                {cols.map((p) => {
                  const ok = p.lines.filter((l) => checkable(l, p.wordings[l])).length;
                  return (
                    <td key={p.id} className={cell(p)}>
                      <span className={cn('num', ok === p.lines.length ? 'text-positive' : 'text-danger')}>
                        {ok === p.lines.length ? <Check className="mr-1 inline h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}
                        {ok} of {p.lines.length} terms
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 text-[13px] text-muted">
          {locked
            ? 'Offers are locked once they are sent for approval.'
            : `Including offer${selected.length === 1 ? '' : 's'} ${selected.join(', ')}. ${needFinance.length ? `Offer ${needFinance.join(', ')} also needs Finance for the three-year commitment.` : 'No Finance step needed.'}`}
        </div>
      </section>
    </div>
  );
}

const priced = (x: number) => Number.isFinite(x);
