'use client';

import Link from 'next/link';
import { ArrowLeft, Check, MessageSquare } from 'lucide-react';
import { Button, StatusPill } from '@/components/ui';
import { formatLakh } from '@/lib/format';
import { atLeast, STATUS_LABEL, type Status } from '@/lib/store';
import type { Contract } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';
import type { BoardTab } from './NextStepPanel';

interface Stage { label: string; tab: BoardTab; doneAt: Status; reachableAt: Status }

const MONEY_STAGES: Stage[] = [
  { label: 'Review changes', tab: 'changes', doneAt: 'sorted', reachableAt: 'received' },
  { label: 'Financial impact', tab: 'tags', doneAt: 'priced', reachableAt: 'sorted' },
  { label: 'Compare offers', tab: 'packages', doneAt: 'awaiting_approval', reachableAt: 'sorted' },
  { label: 'Approval & supplier', tab: 'packages', doneAt: 'agreed', reachableAt: 'awaiting_approval' },
  { label: 'Sign & check', tab: 'signing', doneAt: 'signed', reachableAt: 'agreed' },
];
const LEGAL_STAGES: Stage[] = [
  { label: 'Review changes', tab: 'changes', doneAt: 'sorted', reachableAt: 'received' },
  { label: 'Legal review & sign', tab: 'signing', doneAt: 'signed', reachableAt: 'sorted' },
];

/**
 * Compact negotiation header with the one progress indicator. Each stage is also
 * how you move between the stage screens, so there is no separate tab row.
 */
export function BoardHeader({
  contract, moneyLines, tab, onTab, onAsk, askOpen,
}: {
  contract: Contract;
  moneyLines: number;
  tab: BoardTab;
  onTab: (t: BoardTab) => void;
  onAsk: () => void;
  askOpen: boolean;
}) {
  const { n } = useBoard();
  const status = n.status;
  const stages = moneyLines ? MONEY_STAGES : LEGAL_STAGES;
  const current = stages.findIndex((s) => !atLeast(status, s.doneAt));
  // The approval stage shares the offers screen: underline the current stage when both match.
  const matches = stages.map((s, i) => (s.tab === tab ? i : -1)).filter((i) => i >= 0);
  const shown = matches.includes(current) ? current : matches[0];

  return (
    <section className="rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <Link href="/redlines" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-teal-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Negotiations
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{contract.supplier} renewal</h1>
            <StatusPill tone={status === 'signed' ? 'positive' : status === 'received' ? 'proposed' : 'grey'} dot>
              {STATUS_LABEL[status]}
            </StatusPill>
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {contract.id} · {contract.supplierType} · {formatLakh(contract.annualFeeInr / 1e5)} a year{contract.seats ? ` · ${contract.seats} seats` : ''} · business owner {contract.businessOwner}
          </p>
        </div>
        {!askOpen && (
          <Button variant="outline" onClick={onAsk}>
            <MessageSquare className="h-4 w-4" /> Ask about this negotiation
          </Button>
        )}
      </div>

      <nav aria-label="Negotiation progress" className="border-t border-line px-3">
        <ol className="flex overflow-x-auto">
          {stages.map((s, i) => {
            const done = atLeast(status, s.doneAt);
            const isCurrent = i === current;
            const reachable = atLeast(status, s.reachableAt);
            const isShown = i === shown;
            return (
              <li key={s.label} className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={isShown ? 'step' : undefined}
                  onClick={() => onTab(s.tab)}
                  title={reachable ? undefined : 'Available once the earlier steps are done'}
                  className={cn(
                    'relative flex h-12 items-center gap-2 px-3 text-[14px] transition-colors disabled:cursor-not-allowed',
                    isShown ? 'font-semibold text-teal-900' : reachable ? 'text-ink hover:text-teal-900' : 'text-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                      done ? 'bg-positive text-white' : isCurrent ? 'border-2 border-teal-900 text-teal-900' : 'border border-line text-muted',
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {s.label}
                  <span className="sr-only">{done ? '(done)' : isCurrent ? '(current step)' : ''}</span>
                  {isShown && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-teal-900" aria-hidden />}
                </button>
                {i < stages.length - 1 && <span className="mx-1 h-px w-4 bg-line" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
}
