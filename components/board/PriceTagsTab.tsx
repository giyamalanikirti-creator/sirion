'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Calculator, Check, FlaskConical, MessageSquare, Users, X } from 'lucide-react';
import { Button, Chip, ConfidencePill, EmptyState, SirionCard } from '@/components/ui';
import { groupContractRows, priceTag } from '@/lib/engines/costEngine';
import type { LineComparison } from '@/lib/engines/redline';
import { CLAIM_CHOICE_LABEL, formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { useDemo } from '@/lib/store';
import type { Contract, CreditsGroup, Line, PriceTag } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Credits first: it is the edit that looks most ordinary and costs the most per word. */
const CARD_ORDER: Line[] = ['credits', 'renewal', 'price'];

export const askQuestionFor = (t: PriceTag) => `Why is the ${t.line === 'credits' ? 'credits' : t.line} line ${formatLakh(t.costLakh)}?`;

function ContractsDrawer({ tag, open, onOpenChange }: { tag: PriceTag; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows = groupContractRows(tag.line, tag.group);
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
                {rows.length} of our software contracts use this wording{rows.length ? ` · ${bad} with a poor outcome` : ''}.
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
function Comparison({ c }: { c: LineComparison }) {
  const rows = [
    { k: 'Current wording', group: c.current.group, cost: c.current.costLakh, strong: false },
    { k: 'CloudDesk asks', group: c.ask.group, cost: c.ask.costLakh, strong: true },
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
  { group: 'claim_le_10', label: '10 days' },
  { group: 'claim_11_30', label: '15 days' },
  { group: 'claim_30_autofiled', label: '30 days, auto-filed' },
  { group: 'automatic', label: 'Automatic' },
];

function ClaimWindowWhatIf({ contract, askTag }: { contract: Contract; askTag: PriceTag }) {
  const draft = useDemo((s) => s.creditDraft);
  const saveDraft = useDemo((s) => s.saveCreditDraft);
  const [group, setGroup] = useState<CreditsGroup>(draft ?? 'claim_11_30');
  const alt = priceTag(contract, 'credits', group);
  const diff = askTag.costLakh - alt.costLakh;
  const isAsk = group === askTag.group;

  return (
    <div className="rounded-xl border border-teal-900/25 bg-teal-900/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-title">
        <FlaskConical className="h-4 w-4" /> Try a different claim window
      </div>
      <div role="radiogroup" aria-label="Claim window" className="flex flex-wrap gap-1.5">
        {CLAIM_OPTIONS.map((o) => (
          <button
            key={o.group}
            type="button"
            role="radio"
            aria-checked={group === o.group}
            onClick={() => setGroup(o.group)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs',
              group === o.group ? 'border-teal-900 bg-teal-900 text-white' : 'border-line bg-white text-ink hover:border-teal-900/40',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {!isAsk && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-white p-2.5">
              <div className="text-[11px] text-muted">CloudDesk: 10 days</div>
              <div className="text-[20px] font-light text-teal-900">{formatLakh(askTag.costLakh)}</div>
              <div className="text-[11px] text-muted">{askTag.n} own contracts</div>
            </div>
            <div className="rounded-lg bg-white p-2.5 ring-1 ring-teal-900/30">
              <div className="text-[11px] text-muted">{CLAIM_OPTIONS.find((o) => o.group === group)!.label}</div>
              <div className="text-[20px] font-light text-teal-900">{formatLakh(alt.costLakh)}</div>
              <div className="text-[11px] text-muted">
                {alt.source === 'pooled' && alt.pooledBackup ? `${alt.n} own · pooled, ${alt.pooledBackup.companies} companies` : alt.source === 'assumption' ? 'assumption' : `${alt.n} own contracts`}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink">
            {group === 'claim_11_30' && (
              <>
                We have no contracts with a 15-day window, so this uses the broader <strong className="font-medium">11–30 day</strong> cohort from
                pooled data ({alt.pooledBackup?.label.toLowerCase()}, {alt.pooledBackup?.companies} companies).{' '}
              </>
            )}
            {group === 'claim_30_autofiled' && <>Assumes claims filed by the contract system recover about 90% of credits. </>}
            {group === 'automatic' && <>The benchmark: credits arrive on the invoice without anyone claiming them. </>}
            Exposure falls by {formatLakh(diff)} a year. <ConfidenceInline tag={alt} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draft === group ? (
              <span className="flex items-center gap-1.5 text-xs text-teal-900"><Check className="h-3.5 w-3.5" /> Saved as draft counteroffer</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => saveDraft(group)}>
                Use as draft counteroffer
              </Button>
            )}
            {draft && draft !== group && <span className="text-[11px] text-muted">Current draft: {CLAIM_CHOICE_LABEL[draft]}</span>}
          </div>
        </>
      )}
      {isAsk && <p className="mt-3 text-xs text-muted">This is what CloudDesk asked for. Pick another window to compare.</p>}
    </div>
  );
}

function ConfidenceInline({ tag }: { tag: PriceTag }) {
  return <span className="text-muted">Confidence: {tag.confidence === 'none' ? 'not enough history' : tag.confidence}.</span>;
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
}) {
  const sortResult = useDemo((s) => s.sortResult);
  const markPriced = useDemo((s) => s.markPriced);
  const completeStep = useDemo((s) => s.completeStep);
  const [drawer, setDrawer] = useState<PriceTag | null>(null);

  useEffect(() => {
    if (sortResult) {
      markPriced();
      completeStep(3);
    }
  }, [sortResult, markPriced, completeStep]);

  if (!sortResult) {
    return <EmptyState title="Sort the changes first">Price tags appear once the money lines are found. Go to the Changes tab and press Sort.</EmptyState>;
  }

  const ordered = CARD_ORDER.map((l) => tags.find((t) => t.line === l)!);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white px-6 py-4 text-sm shadow-card">
        Each figure is the <strong className="font-medium">estimated yearly loss vs a procurement benchmark</strong> (opt-in renewal, automatic credits,
        5% price cap), from our own contract history. Against the current contract, accepting all three edits would cost about{' '}
        <strong className="font-medium text-teal-900">{formatLakh(vsCurrentLakh)} a year</strong>.
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {ordered.map((t) => {
          const cmp = comparisons.find((c) => c.line === t.line)!;
          return (
            <SirionCard key={t.line} title={LINE_LABEL[t.line]} className="flex flex-col" bodyClassName="flex flex-1 flex-col">
              <div className="text-[34px] font-light leading-none text-teal-900">{formatLakh(t.costLakh)}</div>
              <div className="mt-1 text-sm text-muted">a year · estimated exposure vs benchmark</div>
              <div className="mt-1 text-xs text-ink">
                {formatLakh(cmp.vsCurrentLakh)} a year more than the current wording
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ConfidencePill confidence={t.confidence} n={t.n} source={t.source} />
                {t.pooledBackup && (
                  <Chip icon={<Users className="h-3 w-3" />} tone="muted" title="Pooled figure from other companies (counts only, 20+ companies)">
                    Pooled: {t.pooledBackup.label.toLowerCase()} · {t.pooledBackup.companies} companies
                  </Chip>
                )}
              </div>
              <div className="mt-4">
                <Comparison c={cmp} />
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {t.proof.map((p, i) => (
                  <li key={i} className={cn('flex gap-2', i === t.proof.length - 1 && 'font-medium text-ink')}>
                    {i === t.proof.length - 1 ? <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" /> : <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />}
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {t.line === 'credits' && (
                <div className="mt-4">
                  <ClaimWindowWhatIf contract={contract} askTag={t} />
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm">
          Estimated annual exposure vs procurement benchmarks: <strong className="font-medium text-teal-900">{formatLakh(totalLakh)} a year</strong>.
        </div>
        <Button onClick={onGoPackages}>
          Build packages <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {drawer && <ContractsDrawer tag={drawer} open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)} />}
    </div>
  );
}
