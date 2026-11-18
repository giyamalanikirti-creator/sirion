'use client';

import { Check } from 'lucide-react';
import { StatusPill } from '@/components/ui';
import { formatLakh, formatPct } from '@/lib/format';
import { atLeast, STATUS_LABEL, type Status, useDemo } from '@/lib/store';
import type { Contract } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS: { label: string; doneAt: Status }[] = [
  { label: 'Sorted', doneAt: 'sorted' },
  { label: 'Priced', doneAt: 'priced' },
  { label: 'Packages', doneAt: 'awaiting_approval' },
  { label: 'Approval', doneAt: 'approved' },
  { label: 'Supplier', doneAt: 'agreed' },
  { label: 'Signed', doneAt: 'signed' },
];

export function BoardHeader({
  contract, totalLakh, vsCurrentLakh, pctOfFee,
}: { contract: Contract; totalLakh: number; vsCurrentLakh: number; pctOfFee: number }) {
  const status = useDemo((s) => s.status);
  const current = STEPS.findIndex((s) => !atLeast(status, s.doneAt));
  return (
    <section className="rounded-2xl border border-line bg-white px-6 py-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-normal text-teal-title">{contract.supplier}</h1>
            <StatusPill tone={status === 'signed' ? 'teal' : status === 'received' ? 'periwinkle' : 'grey'} dot>
              {STATUS_LABEL[status]}
            </StatusPill>
          </div>
          <p className="mt-1 text-sm text-muted">
            Renewal redline · helpdesk software · {formatLakh(contract.annualFeeInr / 1e5)}/yr · {contract.seats} seats · owner {contract.businessOwner}
          </p>
        </div>
        {atLeast(status, 'sorted') ? (
          <div className="ml-auto text-right">
            <div className="text-[26px] font-light leading-tight text-teal-900">{formatLakh(totalLakh)} a year</div>
            <div className="text-sm text-ink">Estimated annual exposure vs procurement benchmarks</div>
            <div className="text-xs text-muted">
              {formatPct(pctOfFee)} of fee · {formatLakh(vsCurrentLakh)} a year more than the current contract
            </div>
          </div>
        ) : (
          <div className="max-w-[260px] text-right text-sm text-muted">Sort the changes to see which ones cost money.</div>
        )}
      </div>

      <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progress">
        {STEPS.map((s, i) => {
          const done = atLeast(status, s.doneAt);
          const isCurrent = i === current;
          return (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
                  done && 'bg-teal-900 text-white',
                  isCurrent && 'border border-teal-900 bg-white text-teal-900',
                  !done && !isCurrent && 'bg-page-bg text-muted',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {done && <Check className="h-3 w-3" />}
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="hidden h-px w-5 bg-line sm:block" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
