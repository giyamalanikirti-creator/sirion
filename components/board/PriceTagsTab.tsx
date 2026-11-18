'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Calculator, Check, FileSearch, MessageSquare, Users, X } from 'lucide-react';
import { Button, Chip, ConfidencePill, EmptyState } from '@/components/ui';
import { getRedline } from '@/lib/data';
import { groupContractRows, priceTag } from '@/lib/engines/costEngine';
import type { LineComparison } from '@/lib/engines/redline';
import { CLAIM_CHOICE_LABEL, formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { STORY_REDLINE, useDemo } from '@/lib/store';
import type { Contract, CreditsGroup, Line, PriceTag } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';

/** Service credits first: the edit that looks most ordinary and costs the most per word. */
const ROW_ORDER: Line[] = ['credits', 'renewal', 'price'];

export const askQuestionFor = (t: PriceTag) => `Why is the ${t.line === 'credits' ? 'credits' : t.line} line ${formatLakh(t.costLakh)}?`;

const priced = (x: number) => Number.isFinite(x);

// ---------------------------------------------------------------------------
// Evidence drawer: everything behind one estimate, without leaving the page.
// ---------------------------------------------------------------------------
function EvidenceDrawer({
  tag, cmp, contract, open, onOpenChange, onAsk,
}: {
  tag: PriceTag;
  cmp: LineComparison;
  contract: Contract;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAsk: (q: string) => void;
}) {
  const rows = groupContractRows(tag.line, tag.group, contract.supplierType);
  const peerUsed = tag.source === 'pooled';
  const compare = [
    { k: 'Current signed contract', group: cmp.current.group, cost: cmp.current.costLakh, cls: 'text-agreement' },
    { k: `${contract.supplier}’s proposal`, group: cmp.ask.group, cost: cmp.ask.costLakh, cls: 'text-proposed' },
    { k: 'Procurement benchmark', group: cmp.benchmark.group, cost: cmp.benchmark.costLakh, cls: 'text-muted' },
  ];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,560px)] flex-col border-l border-line bg-white shadow-[var(--shadow-float)] outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-ink">{LINE_LABEL[tag.line]}: how the estimate is built</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                {priced(tag.costLakh) ? `${formatLakh(tag.costLakh)} a year vs the procurement benchmark` : 'Insufficient internal history to estimate'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted hover:bg-page-bg" aria-label="Close evidence">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <h3 className="text-[14px] font-semibold text-ink">Wording compared</h3>
              <table className="mt-2 w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="py-1.5 font-medium">Version</th>
                    <th className="py-1.5 font-medium">Wording</th>
                    <th className="py-1.5 text-right font-medium">Expected cost / yr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {compare.map((r) => (
                    <tr key={r.k}>
                      <td className={cn('py-2 pr-3 font-medium', r.cls)}>{r.k}</td>
                      <td className="py-2 pr-3 text-ink">{GROUP_LABEL[r.group]}</td>
                      <td className="num py-2 text-right text-ink">
                        {!priced(r.cost) ? '—' : r.cost < -0.005 ? `${formatLakh(-r.cost)} better` : formatLakh(r.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="text-[14px] font-semibold text-ink">Used to calculate this estimate</h3>
              <ul className="mt-2 space-y-2 text-[14px]">
                {tag.proof.map((p, i) => (
                  <li key={i} className={cn('flex gap-2', i === tag.proof.length - 1 && 'font-medium')}>
                    {i === tag.proof.length - 1 ? <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" /> : <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />}
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <ConfidencePill confidence={tag.confidence} n={tag.n} source={tag.source} />
                {peerUsed && tag.pooledBackup && (
                  <Chip icon={<Users className="h-3 w-3" />} tone="teal">Peer data used: {tag.pooledBackup.companies} companies</Chip>
                )}
              </div>
            </section>

            {!peerUsed && tag.pooledBackup && (
              <section>
                <h3 className="text-[14px] font-semibold text-ink">Peer comparison · not used in this number</h3>
                <p className="mt-1 text-[14px] text-muted">{tag.pooledBackup.label} across {tag.pooledBackup.companies} participating companies.</p>
              </section>
            )}

            <section>
              <h3 className="text-[14px] font-semibold text-ink">Your contracts with this wording ({rows.length})</h3>
              {rows.length === 0 ? (
                <p className="mt-1 text-[14px] text-muted">None. {tag.pooledBackup ? 'The estimate relies on peer data.' : 'Insufficient internal history.'}</p>
              ) : (
                <table className="mt-2 w-full text-[13px]">
                  <tbody className="divide-y divide-line border-y border-line">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-2">
                          <div className="text-ink">{r.supplier}</div>
                          <div className="text-[12px] text-muted">{r.id} · {r.wording}</div>
                        </td>
                        <td className={cn('py-2 text-right', r.bad ? 'text-danger' : 'text-ink')}>{r.outcome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
          <div className="border-t border-line px-6 py-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onAsk(askQuestionFor(tag));
              }}
            >
              <MessageSquare className="h-4 w-4" /> Ask about this estimate
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Explore alternatives: starts on the supplier's actual proposal.
// ---------------------------------------------------------------------------
const CLAIM_OPTIONS: { group: CreditsGroup; label: string }[] = [
  { group: 'claim_11_30', label: '15 days' },
  { group: 'claim_30_autofiled', label: '30 days, filed automatically' },
  { group: 'automatic', label: 'Automatic credits' },
];

function ExploreAlternatives({ contract, askTag, onViewDraft }: { contract: Contract; askTag: PriceTag; onViewDraft: () => void }) {
  const { n, saveCreditDraft } = useBoard();
  const draft = n.creditDraft;
  const peerOn = useDemo((s) => s.data.usePeerBenchmarks);
  const [group, setGroup] = useState<CreditsGroup | undefined>(draft);
  const alt = group ? priceTag(contract, 'credits', group) : undefined;
  const altPriced = !!alt && priced(alt.costLakh);
  const label = CLAIM_OPTIONS.find((o) => o.group === group)?.label;
  const askLabel = askTag.group === 'claim_le_10' ? '10 days' : GROUP_LABEL[askTag.group];

  const option = (selected: boolean) =>
    cn('h-9 rounded-md border px-3 text-[13px] transition-colors', selected ? 'border-teal-900 bg-teal-tint font-semibold text-teal-900' : 'border-line bg-white text-ink hover:bg-page-bg');

  return (
    <section className="rounded-lg border border-line bg-white" aria-labelledby="alts">
      <header className="border-b border-line px-5 py-3">
        <h2 id="alts" className="text-[16px] font-semibold text-ink">Explore alternatives · service credit claim window</h2>
        <p className="text-[13px] text-muted">See how the estimate and its evidence change before you counter.</p>
      </header>
      <div className="px-5 py-4">
        <div role="radiogroup" aria-label="Claim window" className="flex flex-wrap gap-2">
          <button type="button" role="radio" aria-checked={!group} onClick={() => setGroup(undefined)} className={option(!group)}>
            {askLabel} · {contract.supplier}’s proposal
          </button>
          {CLAIM_OPTIONS.map((o) => (
            <button key={o.group} type="button" role="radio" aria-checked={group === o.group} onClick={() => setGroup(o.group)} className={option(group === o.group)}>
              {o.label}
            </button>
          ))}
        </div>

        {!group ? (
          <p className="mt-3 text-[14px] text-muted">
            {contract.supplier}’s {askLabel} proposal: <span className="num font-semibold text-ink">{formatLakh(askTag.costLakh)}</span> a year vs the benchmark. Choose an alternative to compare.
          </p>
        ) : (
          alt && (
            <>
              <div className="mt-4 grid grid-cols-2 divide-x divide-line rounded-md border border-line">
                <div className="p-3">
                  <div className="text-[12px] text-muted">{askLabel} · {contract.supplier}’s proposal</div>
                  <div className="num mt-0.5 text-[22px] font-semibold text-ink">{formatLakh(askTag.costLakh)}</div>
                  <div className="text-[12px] text-muted">{askTag.source === 'own' ? `${askTag.n} of your contracts` : 'peer data'}</div>
                </div>
                <div className="bg-teal-tint/40 p-3">
                  <div className="text-[12px] text-muted">{label}</div>
                  <div className={cn('num mt-0.5 font-semibold', altPriced ? 'text-[22px] text-teal-900' : 'text-[15px] text-danger')}>
                    {altPriced ? formatLakh(alt.costLakh) : 'Insufficient internal history to estimate'}
                  </div>
                  <div className="text-[12px] text-muted">
                    {!altPriced ? `${alt.n} comparable contracts` : alt.source === 'pooled' && alt.pooledBackup ? `${alt.pooledBackup.companies} participating companies` : alt.source === 'assumption' ? 'assumption' : `${alt.n} of your contracts`}
                  </div>
                </div>
              </div>
              <p className="mt-3 max-w-[80ch] text-[14px] text-ink">
                {group === 'claim_11_30' &&
                  (altPriced ? (
                    <>
                      Your company has {alt.n === 0 ? 'no' : `only ${alt.n}`} comparable contract{alt.n === 1 ? '' : 's'} for a 15-day window, so this estimate relies on a broader{' '}
                      <strong className="font-semibold">11–30 day cohort from {alt.pooledBackup?.companies} participating companies</strong>. Confidence is low.
                    </>
                  ) : (
                    <>Your company has no comparable contracts for a 15-day window{peerOn ? '' : ', and peer benchmarks are turned off for this workspace'}. You can still save it to your draft offer.</>
                  ))}
                {group === 'claim_30_autofiled' && <>Assumes claims filed by the contract system recover about 90% of credits. Confidence is low.</>}
                {group === 'automatic' && <>Today’s wording and the benchmark: credits arrive on the invoice without anyone claiming them.</>}
                {altPriced && group !== 'automatic' && <> Exposure falls by <span className="num font-semibold">{formatLakh(askTag.costLakh - alt.costLakh)}</span> a year.</>}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {draft === group ? (
                  <>
                    <span role="status" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-positive">
                      <Check className="h-4 w-4" /> Saved to your draft offer: {CLAIM_CHOICE_LABEL[group]}
                    </span>
                    <Button onClick={onViewDraft}>View my draft <ArrowRight className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <Button onClick={() => saveCreditDraft(group)}>Save to draft offer</Button>
                )}
                {draft && draft !== group && <span className="text-[13px] text-muted">Your draft currently has: {CLAIM_CHOICE_LABEL[draft]}</span>}
              </div>
            </>
          )
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The stage
// ---------------------------------------------------------------------------
export function PriceTagsTab({
  tags, comparisons, totalLakh, vsCurrentLakh, contract, onGoPackages, onAsk,
}: {
  tags: PriceTag[];
  comparisons: LineComparison[];
  totalLakh: number;
  vsCurrentLakh: number;
  contract: Contract;
  onGoPackages: () => void;
  onAsk: (question: string) => void;
  onGoTab?: (t: 'changes' | 'tags' | 'packages' | 'signing') => void;
}) {
  const { id, n, markPriced } = useBoard();
  const sortResult = n.sortResult;
  const completeStep = useDemo((s) => s.completeStep);
  const [drawer, setDrawer] = useState<Line | null>(null);

  useEffect(() => {
    if (sortResult) {
      markPriced();
      if (id === STORY_REDLINE) completeStep(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortResult, id]);

  if (!sortResult) return <EmptyState title="Analyse the changes first">The financial impact appears once the commercial changes are found.</EmptyState>;
  if (!tags.length) return <EmptyState title="No financial impact">None of {contract.supplier}’s changes touch renewal, service credits or price.</EmptyState>;

  const ordered = ROW_ORDER.map((l) => tags.find((t) => t.line === l)).filter((t): t is PriceTag => !!t);
  const unpriced = tags.filter((t) => !priced(t.costLakh)).length;
  const k = ordered.length;
  const changesWord = k === 1 ? 'this change' : k === 2 ? 'both changes' : `all ${k === 3 ? 'three' : k} changes`;
  const plainFor = (l: Line) => getRedline(id).changes.find((c) => c.expected.line === l)?.plain;
  const credits = ordered.find((t) => t.line === 'credits');
  const drawerTag = drawer ? tags.find((t) => t.line === drawer) : undefined;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-white px-6 py-5" aria-labelledby="impact-headline">
        <div className="text-[13px] font-medium text-muted">Financial impact · estimate</div>
        {vsCurrentLakh > 0.005 ? (
          <h2 id="impact-headline" className="mt-1 max-w-[60ch] text-[20px] font-semibold leading-snug text-ink">
            Accepting {changesWord} could cost an estimated{' '}
            <span className="num block text-[40px] font-semibold leading-tight tracking-tight text-teal-900 sm:inline sm:text-[40px]">{formatLakh(vsCurrentLakh)}</span>{' '}
            more per year than your current contract.
          </h2>
        ) : (
          <h2 id="impact-headline" className="mt-1 max-w-[60ch] text-[20px] font-semibold leading-snug text-ink">
            Accepting {changesWord} costs nothing extra compared with your current contract: today’s wording already has the same weakness.
          </h2>
        )}
        <p className="mt-2 text-[14px] text-muted">
          Secondary comparison: <span className="num font-semibold text-ink">{formatLakh(totalLakh)}</span> a year versus procurement benchmarks (opt-in renewal, automatic credits, a 5% price cap).
          {unpriced > 0 && ` ${unpriced} term could not be estimated: insufficient internal history.`}
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-white" aria-label="Commercial changes">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[14px]">
            <thead className="bg-page-bg/60">
              <tr className="text-left text-[12px] text-muted">
                <th className="w-[38%] px-5 py-2.5 font-semibold">{contract.supplier}’s request</th>
                <th className="px-3 py-2.5 text-right font-semibold">Estimated effect / yr</th>
                <th className="px-3 py-2.5 font-semibold">Basis of calculation</th>
                <th className="px-5 py-2.5 text-right font-semibold"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ordered.map((t) => {
                const cmp = comparisons.find((c) => c.line === t.line)!;
                const ok = priced(t.costLakh);
                return (
                  <tr key={t.line} className="align-top">
                    <td className="px-5 py-4">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{LINE_LABEL[t.line]}</div>
                      <div className="mt-0.5 text-ink">{plainFor(t.line) ?? GROUP_LABEL[t.group]}</div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      {ok ? (
                        <>
                          <div className="num text-[18px] font-semibold text-ink">
                            {cmp.vsCurrentLakh > 0.005 ? `+${formatLakh(cmp.vsCurrentLakh)}` : '₹0'}
                          </div>
                          <div className="text-[12px] text-muted">vs current contract</div>
                          <div className="num mt-1 text-[12px] text-muted">{formatLakh(t.costLakh)} vs benchmark</div>
                        </>
                      ) : (
                        <div className="text-[13px] font-medium text-danger">Insufficient internal history to estimate</div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <ConfidencePill confidence={t.confidence} n={t.n} source={t.source} />
                      <div className="mt-1.5 max-w-[34ch] text-[13px] text-muted">{t.proof[t.proof.length - 1]}</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => setDrawer(t.line)}>
                        <FileSearch className="h-3.5 w-3.5" /> Evidence
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {credits && <ExploreAlternatives contract={contract} askTag={credits} onViewDraft={onGoPackages} />}

      {drawerTag && (
        <EvidenceDrawer
          tag={drawerTag}
          cmp={comparisons.find((c) => c.line === drawerTag.line)!}
          contract={contract}
          open={!!drawer}
          onOpenChange={(o) => !o && setDrawer(null)}
          onAsk={onAsk}
        />
      )}
    </div>
  );
}
