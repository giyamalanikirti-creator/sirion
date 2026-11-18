'use client';

import { Check } from 'lucide-react';
import { StatusPill } from '@/components/ui';
import { formatLakh, formatPct } from '@/lib/format';
import { atLeast, STATUS_LABEL, type Status } from '@/lib/store';
import { useBoard } from './context';
import type { Contract } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS: { label: string; doneAt: Status }[] = [
  { label: 'Analysed', doneAt: 'sorted' },
  { label: 'Impact', doneAt: 'priced' },
  { label: 'Offers', doneAt: 'awaiting_approval' },
  { label: 'Approval', doneAt: 'approved' },
  { label: 'Supplier', doneAt: 'agreed' },
  { label: 'Signed', doneAt: 'signed' },
];

const LEGAL_ONLY_STEPS: { label: string; doneAt: Status }[] = [
  { label: 'Analysed', doneAt: 'sorted' },
  { label: 'Signed', doneAt: 'signed' },
];

export function BoardHeader({
  contract, totalLakh, vsCurrentLakh, pctOfFee, moneyLines, unpriced,
}: { contract: Contract; totalLakh: number; vsCurrentLakh: number; pctOfFee: number; moneyLines: number; unpriced: number }) {
  const { n } = useBoard();
  const status = n.status;
  const steps = moneyLines ? STEPS : LEGAL_ONLY_STEPS;
  const current = steps.findIndex((s) => !atLeast(status, s.doneAt));
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
            Renewal redline · {contract.supplierType} · {formatLakh(contract.annualFeeInr / 1e5)}/yr{contract.seats ? ` · ${contract.seats} seats` : ''} · owner {contract.businessOwner}
          </p>
        </div>
        {atLeast(status, 'sorted') && !moneyLines ? (
          <div className="ml-auto max-w-[280px] text-right text-sm text-muted">No money lines: every change is with legal. Nothing to price.</div>
        ) : atLeast(status, 'sorted') ? (
          <div className="ml-auto text-right">
            <div className="text-[26px] font-light leading-tight text-teal-900">
              {vsCurrentLakh > 0.005 ? `${formatLakh(vsCurrentLakh)} more a year` : 'No extra cost'}
            </div>
            <div className="text-sm text-ink">than your current contract, if you accept every change (estimate)</div>
            <div className="text-xs text-muted">
              {formatLakh(totalLakh)} a year vs procurement benchmarks · {formatPct(pctOfFee)} of fee
              {unpriced > 0 && ` · ${unpriced} line not priced (not enough history)`}
            </div>
          </div>
        ) : (
          <div className="max-w-[260px] text-right text-sm text-muted">Analyse the changes to see which ones affect what you pay.</div>
        )}
      </div>

      <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progress">
        {steps.map((s, i) => {
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
              {i < steps.length - 1 && <span className="hidden h-px w-5 bg-line sm:block" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
