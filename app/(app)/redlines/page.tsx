'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Inbox } from 'lucide-react';
import { EmptyState, GROUP_TONE, PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { redlines } from '@/lib/data';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatDate, formatLakh } from '@/lib/format';
import { atLeast, STATUS_LABEL, STORY_REDLINE, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

type View = 'waiting' | 'all' | 'supplier' | 'signed';
const VIEWS: { id: View; label: string }[] = [
  { id: 'waiting', label: 'Waiting on me' },
  { id: 'all', label: 'All' },
  { id: 'supplier', label: 'With supplier' },
  { id: 'signed', label: 'Signed' },
];

export default function InboxPage() {
  const router = useRouter();
  const negotiations = useDemo((s) => s.negotiations);
  const completeStep = useDemo((s) => s.completeStep);
  const [view, setView] = useState<View>('all');

  const rows = useMemo(() => {
    return redlines.map((r) => {
      const status = negotiations[r.id]?.status ?? 'received';
      const g = (k: string) => r.changes.filter((c) => c.expected.group === k).length;
      // Lead-action statuses are "waiting on me"; approval and supplier stages wait on others.
      const bucket: View =
        status === 'signed' ? 'signed' : status === 'with_supplier' ? 'supplier' : status === 'awaiting_approval' ? 'all' : 'waiting';
      return {
        r, status, harmless: g('harmless'), legal: g('legal'), money: g('money'),
        atStake: redlinePriceTags(r.id).totalLakh, label: STATUS_LABEL[status], bucket, isNew: status === 'received',
        unsorted: !atLeast(status, 'sorted'), total: r.changes.length,
      };
    });
  }, [negotiations]);

  const shown = rows.filter((x) => view === 'all' || x.bucket === view);
  const counts = Object.fromEntries(VIEWS.map((v) => [v.id, rows.filter((x) => v.id === 'all' || x.bucket === v.id).length]));

  const open = (id: string) => {
    if (id === STORY_REDLINE) completeStep(1);
    router.push(`/redlines/${id}`);
  };

  return (
    <>
      <PageHeader title="Redline inbox" subtitle="Supplier changes waiting on procurement, sorted and priced before anyone says yes." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Saved views" className="flex gap-2 overflow-x-auto lg:flex-col">
          <div className="hidden px-3 pb-1 text-[11px] uppercase tracking-wide text-muted lg:block">Saved views</div>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={cn(
                'flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm',
                view === v.id ? 'bg-white font-medium text-teal-900 shadow-card' : 'text-ink hover:bg-white/70',
              )}
            >
              {v.label}
              <span className="rounded-full bg-page-bg px-2 text-xs text-muted">{counts[v.id]}</span>
            </button>
          ))}
        </nav>

        <SirionCard
          title={<span className="flex items-center gap-2"><Inbox className="h-4 w-4" /> Redlines</span>}
          action={<span className="hidden items-center gap-1 text-sm text-muted sm:flex"><Filter className="h-4 w-4" /> Filters</span>}
          bodyClassName="p-0"
        >
          {shown.length === 0 ? (
            <div className="p-6"><EmptyState title="Nothing here">No redlines in this view right now.</EmptyState></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-6 py-3 font-normal">Supplier</th>
                    <th className="px-3 py-3 font-normal">Type</th>
                    <th className="px-3 py-3 font-normal">Received</th>
                    <th className="px-3 py-3 font-normal">Changes</th>
                    <th className="px-3 py-3 text-right font-normal" title="Estimated yearly exposure vs procurement benchmarks">Est. exposure / yr</th>
                    <th className="px-6 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x) => (
                    <tr
                      key={x.r.id}
                      tabIndex={0}
                      aria-label={`Open ${x.r.supplier} redline`}
                      onClick={() => open(x.r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          open(x.r.id);
                        }
                      }}
                      className={cn('h-12 cursor-pointer border-t border-line hover:bg-page-bg/70', x.isNew && 'bg-teal-900/[0.03]')}
                    >
                      <td className="px-6">
                        <div className="flex items-center gap-2">
                          {x.isNew && <span className="h-2 w-2 rounded-full bg-teal-900" aria-label="New" />}
                          <span className="font-medium text-teal-900">{x.r.supplier}</span>
                        </div>
                      </td>
                      <td className="px-3 capitalize text-muted">{x.r.supplierType}</td>
                      <td className="px-3 text-muted">{formatDate(x.r.receivedAt)}</td>
                      <td className="px-3">
                        {x.unsorted ? (
                          <span className="text-muted">{x.total} changes · not sorted yet</span>
                        ) : (
                        <div className="flex gap-1">
                          <StatusPill tone={GROUP_TONE.harmless}>{x.harmless} harmless</StatusPill>
                          <StatusPill tone={GROUP_TONE.legal}>{x.legal} legal</StatusPill>
                          <StatusPill tone={GROUP_TONE.money}>{x.money} money</StatusPill>
                        </div>
                        )}
                      </td>
                      <td className="px-3 text-right tabular-nums">
                        {x.status === 'signed' ? (
                          <span className="text-muted">Signed</span>
                        ) : x.unsorted ? (
                          <span className="text-muted">Not priced yet</span>
                        ) : x.money === 0 ? (
                          <span className="text-muted">No money lines</span>
                        ) : (
                          formatLakh(x.atStake)
                        )}
                      </td>
                      <td className="px-6">
                        <StatusPill tone={x.label === 'Signed' ? 'teal' : x.label === 'New' ? 'periwinkle' : 'grey'} dot>
                          {x.label}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-end gap-6 border-t border-line px-6 py-3 text-xs text-muted">
            <span>Rows per page 10</span>
            <span>1–{shown.length} of {shown.length}</span>
          </div>
        </SirionCard>
      </div>
    </>
  );
}
