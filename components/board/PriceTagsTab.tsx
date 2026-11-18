'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Calculator, Users, X } from 'lucide-react';
import { Button, Chip, ConfidencePill, EmptyState, SirionCard } from '@/components/ui';
import { groupContractRows } from '@/lib/engines/costEngine';
import { formatLakh, GROUP_LABEL, LINE_LABEL } from '@/lib/format';
import { useDemo } from '@/lib/store';
import type { PriceTag } from '@/lib/types';
import { cn } from '@/lib/utils';

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

export function PriceTagsTab({ tags, totalLakh, onGoPackages }: { tags: PriceTag[]; totalLakh: number; onGoPackages: () => void }) {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {tags.map((t) => (
          <SirionCard key={t.line} title={LINE_LABEL[t.line]} className="flex flex-col">
            <div className="text-xs text-muted">CloudDesk asks for: {GROUP_LABEL[t.group].toLowerCase()}</div>
            <div className="mt-3 text-[34px] font-light leading-none text-teal-900">{formatLakh(t.costLakh)}</div>
            <div className="mt-1 text-sm text-muted">a year · cost if we say yes</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ConfidencePill confidence={t.confidence} n={t.n} source={t.source} />
              {t.pooledBackup && (
                <Chip icon={<Users className="h-3 w-3" />} tone="muted" title="Pooled figure from other companies (counts only, 20+ companies)">
                  Pooled: {t.pooledBackup.label.toLowerCase()} · {t.pooledBackup.companies} companies
                </Chip>
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {t.proof.map((p, i) => (
                <li key={i} className={cn('flex gap-2', i === t.proof.length - 1 && 'font-medium text-ink')}>
                  {i === t.proof.length - 1 ? <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-teal-900" /> : <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />}
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setDrawer(t)}>
                See the contracts <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SirionCard>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm">
          Saying yes to all three money lines would cost about <strong className="font-medium text-teal-900">{formatLakh(totalLakh)} a year</strong>.
          <span className="ml-1 text-muted">Benchmarks: opt-in renewal, automatic credits, 5% price cap.</span>
        </div>
        <Button onClick={onGoPackages}>
          Build packages <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      {drawer && <ContractsDrawer tag={drawer} open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)} />}
    </div>
  );
}
