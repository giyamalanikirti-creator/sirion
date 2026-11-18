'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Calculator, Check, FlaskConical, MessageSquare, Users, X } from 'lucide-react';
import { Button, Chip, ConfidencePill, EmptyState, SirionCard } from '@/components/ui';
import { groupContractRows, priceTag } from '@/lib/engines/costEngine';
import type { LineComparison } from '@/lib/engines/redline';
import { CLAIM_CHOICE_LABEL, formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { STORY_REDLINE, useDemo } from '@/lib/store';
import { useBoard } from './context';
import type { Contract, CreditsGroup, Line, PriceTag } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Credits first: it is the edit that looks most ordinary and costs the most per word. */
const CARD_ORDER: Line[] = ['credits', 'renewal', 'price'];

export const askQuestionFor = (t: PriceTag) => `Why is the ${t.line === 'credits' ? 'credits' : t.line} line ${formatLakh(t.costLakh)}?`;

function ContractsDrawer({ tag, type, open, onOpenChange }: { tag: PriceTag; type: Contract['supplierType']; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows = groupContractRows(tag.line, tag.group, type);
  const bad = rows.filter((r) => r.bad).length;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,520px)] flex-col bg-white shadow-2xl outline-none">
          <div className="flex items-start justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-[17px] text-teal-title">
                {LINE_LABEL[tag.line]}: {GROUP_LABEL[tag.group]}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                {rows.length} of our {type} contracts use this wording{rows.length ? ` · ${bad} with a poor outcome` : ''}.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted hover:bg-page-bg" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No own contracts with this wording">
                  {tag.pooledBackup ? `This figure uses pooled data: ${tag.pooledBackup.label.toLowerCase()} (${tag.pooledBackup.companies} companies).` : 'Not enough history.'}
                </EmptyState>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-6 py-3 font-normal">Contract</th>
                    <th className="px-3 py-3 font-normal">Wording</th>
                    <th className="px-6 py-3 font-normal">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="h-12 border-t border-line">
                      <td className="px-6">
                        <div>{r.supplier}</div>
                        <div className="text-xs text-muted">{r.id}</div>
                      </td>
                      <td className="px-3 text-muted">{r.wording}</td>
                      <td className={cn('px-6', r.bad ? 'text-danger' : 'text-ink')}>{r.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="border-t border-line px-6 py-3 text-xs text-muted">Rows per page 25 · 1–{rows.length} of {rows.length}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Current wording / supplier asks / benchmark used, each with its estimated yearly exposure. */
function Comparison({ c, supplier }: { c: LineComparison; supplier: string }) {
  const rows = [
    { k: 'Current wording', group: c.current.group, cost: c.current.costLakh, strong: false },
    { k: `${supplier} asks`, group: c.ask.group, cost: c.ask.costLakh, strong: true },
    { k: 'Benchmark used', group: c.benchmark.group, cost: c.benchmark.costLakh, strong: false },
  ];
  return (
    <dl className="divide-y divide-line rounded-xl border border-line text-sm">
      {rows.map((r) => (
        <div key={r.k} className={cn('grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2', r.strong && 'bg-periwinkle/[0.07]')}>
          <dt className="text-[11px] uppercase tracking-wide text-muted">{r.k}</dt>
          <dd className={cn('row-span-2 self-center text-right tabular-nums', r.strong ? 'font-medium text-teal-900' : 'text-ink')}>
            {r.cost < -0.005 ? `${formatLakh(-r.cost)} better` : formatLakh(r.cost)}
          </dd>
          <dd className={cn(r.strong && 'font-medium')}>{GROUP_LABEL[r.group]}</dd>
        </div>
      ))}
    </dl>
  );
}

const CLAIM_OPTIONS: { group: CreditsGroup; label: string }[] = [
  { group: 'claim_11_30', label: '15 days' },
  { group: 'claim_30_autofiled', label: '30 days, filed automatically' },
  { group: 'automatic', label: 'Automatic credits' },
];

/** "Try a different claim window": starts on the supplier's proposal; the comparison appears only after a choice. */
function ClaimWindowWhatIf({ contract, askTag, onReviewDraft }: { contract: Contract; askTag: PriceTag; onReviewDraft: () => void }) {
  const { n, saveCreditDraft: saveDraft } = useBoard();
  const draft = n.creditDraft;
  const peerOn = useDemo((s) => s.data.usePeerBenchmarks);
  const [group, setGroup] = useState<CreditsGroup | undefined>(draft);
  const alt = group ? priceTag(contract, 'credits', group) : undefined;
  const priced = alt && Number.isFinite(alt.costLakh);
  const label = CLAIM_OPTIONS.find((o) => o.group === group)?.label;

  return (
    <div className="rounded-xl border border-teal-900/25 bg-teal-900/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-title">
        <FlaskConical className="h-4 w-4" /> Try a different claim window
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setGroup(undefined)}
          aria-pressed={!group}
          className={cn('rounded-full border px-2.5 py-1 text-xs', !group ? 'border-teal-900 bg-teal-900 text-white' : 'border-line bg-white text-ink hover:border-teal-900/40')}
        >
          {contract.supplier}’s proposal · {askTag.group === 'claim_le_10' ? '10 days or less' : GROUP_LABEL[askTag.group].toLowerCase()}
        </button>
        {CLAIM_OPTIONS.map((o) => (
          <button
            key={o.group}
            type="button"
            aria-pressed={group === o.group}
            onClick={() => setGroup(o.group)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs',
              group === o.group ? 'border-teal-900 bg-teal-900 text-white' : 'border-line bg-white text-ink hover:border-teal-900/40',
            )}
          >
            Try {o.label.toLowerCase()}
          </button>
        ))}
      </div>

      {!group && <p className="mt-3 text-xs text-muted">Pick an alternative to see how the estimate and its evidence change.</p>}

      {group && alt && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white p-2.5">
              <div className="text-[11px] text-muted">{contract.supplier}’s proposal</div>
              <div className="text-[20px] font-light text-teal-900">{formatLakh(askTag.costLakh)}</div>
              <div className="text-[11px] text-muted">{askTag.source === 'own' ? `${askTag.n} of your contracts` : 'peer data'}</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 ring-1 ring-teal-900/30">
              <div className="text-[11px] text-muted">{label}</div>
              <div className={cn('font-light', priced ? 'text-[20px] text-teal-900' : 'py-1 text-[13px] text-danger')}>
                {priced ? formatLakh(alt.costLakh) : 'Insufficient data to estimate'}
              </div>
              <div className="text-[11px] text-muted">
                {!priced ? 'no comparable contracts' : alt.source === 'pooled' && alt.pooledBackup ? `${alt.pooledBackup.companies} participating companies` : alt.source === 'assumption' ? 'assumption' : `${alt.n} of your contracts`}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink">
            {group === 'claim_11_30' &&
              (priced ? (
                <>
                  Your company has {alt.n === 0 ? 'no' : `only ${alt.n}`} comparable contract{alt.n === 1 ? '' : 's'} for this window. This estimate uses outcomes from{' '}
                  {alt.pooledBackup?.companies} participating companies (claim windows of 11–30 days). Confidence is low.
                </>
              ) : (
                <>
                  Your company has no comparable contracts for this window{peerOn ? '' : ', and peer benchmarks are turned off for this workspace'}. You can still draft it as a counter.
                </>
              ))}
            {group === 'claim_30_autofiled' && <>Assumes claims filed by the contract system recover about 90% of credits. Confidence is low.</>}
            {group === 'automatic' && <>Today’s wording and the benchmark: credits arrive on the invoice without anyone claiming them.</>}
            {priced && group !== 'automatic' && <> Exposure falls by {formatLakh(askTag.costLakh - alt.costLakh)} a year.</>}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draft === group ? (
              <>
                <span className="flex items-center gap-1.5 text-xs text-teal-900"><Check className="h-3.5 w-3.5" /> Saved as your draft counter</span>
                <Button size="sm" onClick={onReviewDraft}>Review my draft <ArrowRight className="h-3.5 w-3.5" /></Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => saveDraft(group)}>Save as my draft counter</Button>
            )}
            {draft && draft !== group && <span className="text-[11px] text-muted">Current draft: {CLAIM_CHOICE_LABEL[draft]}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** Evidence actually used for the number, kept apart from peer data shown only for comparison. */
function Evidence({ t }: { t: PriceTag }) {
  const peerUsed = t.source === 'pooled';
  return (
    <div className="mt-4 space-y-3">
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Used to calculate this estimate</div>
        <ul className="space-y-2 text-sm">
          {t.proof.map((p, i) => (
            <li key={i} className={cn('flex gap-2', i === t.proof.length - 1 && 'font-medium text-ink')}>
              {i === t.proof.length - 1 ? <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" /> : <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />}
              <span>{p}</span>
            </li>
          ))}
        </ul>
        {peerUsed && t.pooledBackup && (
          <div className="mt-2">
            <Chip icon={<Users className="h-3 w-3" />} tone="teal">Peer data used: {t.pooledBackup.label.toLowerCase()} · {t.pooledBackup.companies} companies</Chip>
          </div>
        )}
      </div>
      {!peerUsed && t.pooledBackup && (
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">Peer comparison · not used in this number</div>
          <Chip icon={<Users className="h-3 w-3" />} tone="muted">{t.pooledBackup.label} across {t.pooledBackup.companies} companies</Chip>
        </div>
      )}
    </div>
  );
}

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
  const [drawer, setDrawer] = useState<PriceTag | null>(null);

  useEffect(() => {
    if (sortResult) {
      markPriced();
      if (id === STORY_REDLINE) completeStep(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortResult, id]);

  if (!sortResult) {
    return <EmptyState title="Analyse the changes first">The financial impact appears once the commercial changes are found. Use Analyse above.</EmptyState>;
  }
  if (!tags.length) {
    return <EmptyState title="No financial impact">None of {contract.supplier}’s changes touch renewal, service credits or price.</EmptyState>;
  }

  const ordered = CARD_ORDER.map((l) => tags.find((t) => t.line === l)).filter((t): t is PriceTag => !!t);
  const unpriced = tags.filter((t) => !Number.isFinite(t.costLakh)).length;
  const k = ordered.length;
  const changesWord = k === 1 ? 'this commercial change' : k === 2 ? 'both commercial changes' : `all ${k === 3 ? 'three' : k} commercial changes`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white px-6 py-5 shadow-card">
        <p className="text-[18px] leading-snug text-teal-title">
          {vsCurrentLakh > 0.005 ? (
            <>Accepting {changesWord} could cost an estimated <strong className="font-medium text-teal-900">{formatLakh(vsCurrentLakh)} more per year</strong> than your current contract.</>
          ) : (
            <>Accepting {changesWord} costs nothing extra compared with your current contract: today’s wording already has the same weakness.</>
          )}
        </p>
        <p className="mt-1 text-sm text-muted">
          Against procurement benchmarks (opt-in renewal, automatic credits, a 5% price cap) the exposure is {formatLakh(totalLakh)} a year.
          {unpriced > 0 && ` ${unpriced} term could not be estimated: insufficient data.`}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {ordered.map((t) => {
          const cmp = comparisons.find((c) => c.line === t.line)!;
          const vsCurrent = cmp.vsCurrentLakh;
          return (
            <SirionCard key={t.line} title={LINE_LABEL[t.line]} className="flex flex-col" bodyClassName="flex flex-1 flex-col">
              <div className="text-[34px] font-light leading-none text-teal-900">
                {!Number.isFinite(t.costLakh) ? <span className="text-[22px] text-danger">Insufficient data to estimate</span> : vsCurrent > 0.005 ? formatLakh(vsCurrent) : '₹0'}
              </div>
              <div className="mt-1 text-sm text-muted">
                {Number.isFinite(t.costLakh) && (vsCurrent > 0.005 ? 'a year more than your current contract' : 'extra a year: same wording group as today')}
              </div>
              {Number.isFinite(t.costLakh) && <div className="mt-1 text-xs text-ink">{formatLakh(t.costLakh)} a year vs the procurement benchmark</div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <ConfidencePill confidence={t.confidence} n={t.n} source={t.source} />
              </div>
              <div className="mt-4">
                <Comparison c={cmp} supplier={contract.supplier} />
              </div>
              <Evidence t={t} />
              {t.line === 'credits' && (
                <div className="mt-4">
                  <ClaimWindowWhatIf contract={contract} askTag={t} onReviewDraft={onGoPackages} />
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-1 pt-4">
                <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setDrawer(t)}>
                  See the contracts <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onAsk(askQuestionFor(t))}>
                  <MessageSquare className="h-3.5 w-3.5" /> Ask about this estimate
                </Button>
              </div>
            </SirionCard>
          );
        })}
      </div>
      {drawer && <ContractsDrawer tag={drawer} type={contract.supplierType} open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)} />}
    </div>
  );
}
