'use client';

import { useState } from 'react';
import { Check, Compass, RotateCcw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type Role, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '../ui';

const BOARD = '/redlines/RL-CLOUDDESK';

export const DEMO_STEPS: { n: number; role: Role; title: string; detail: string; href: string }[] = [
  { n: 1, role: 'lead', title: 'Open the inbox, click CloudDesk', detail: '6 changes, 3 money lines, ₹11.6 lakh a year at stake', href: '/redlines' },
  { n: 2, role: 'lead', title: 'Changes tab → Sort', detail: '2 harmless logged · 1 to legal · 3 money lines', href: `${BOARD}?tab=changes` },
  { n: 3, role: 'lead', title: 'Price tags tab', detail: '₹4.5 / ₹3.2 / ₹3.8 lakh with proof; open a drawer', href: `${BOARD}?tab=tags` },
  { n: 4, role: 'lead', title: 'Ask a what-if → Packages → Send for approval', detail: '15-day claim = ₹2.4 lakh (pooled, 27 companies)', href: `${BOARD}?tab=packages` },
  { n: 5, role: 'owner', title: 'Owner approves; finance approves A', detail: 'B’s give is under the ₹5 lakh limit', href: '/approvals' },
  { n: 6, role: 'supplier', title: 'Supplier picks B, suggests a 7% cap', detail: 'No ₹ shown to the supplier', href: '/portal/clouddesk' },
  { n: 7, role: 'lead', title: 'Accept the counter', detail: '₹1.1 lakh, inside the ₹1.5 lakh range', href: BOARD },
  { n: 8, role: 'lead', title: 'Signing tab → Send for signature', detail: '3 of 3 enforceable · ₹9.2 lakh net · 62% → 66%', href: `${BOARD}?tab=signing` },
  { n: 9, role: 'lead', title: 'Insights', detail: 'Predicted vs actual, one miss flagged', href: '/insights' },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const done = useDemo((s) => s.completedSteps);
  const status = useDemo((s) => s.status);
  const role = useDemo((s) => s.role);
  const setRole = useDemo((s) => s.setRole);
  const reset = useDemo((s) => s.reset);

  // Step 5 needs finance after the owner: route to the right role.
  const go = (step: (typeof DEMO_STEPS)[number]) => {
    let r = step.role;
    if (step.n === 5) r = useDemo.getState().ownerApproved ? 'finance' : 'owner';
    setRole(r);
    router.push(step.href);
    setOpen(false);
  };

  const next = DEMO_STEPS.find((s) => !done.includes(s.n));

  return (
    <div className="fixed bottom-20 left-4 z-50 md:bottom-5 md:left-20">
      {open && (
        <div role="dialog" aria-label="Demo guide" className="mb-3 w-[min(92vw,380px)] rounded-2xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <div>
              <div className="text-[15px] text-teal-title">Demo guide</div>
              <div className="text-xs text-muted">About 3 minutes · status: {status.replace('_', ' ')}</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close demo guide" className="rounded p-1 text-muted hover:bg-page-bg">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="max-h-[55vh] overflow-y-auto px-3 py-2">
            {DEMO_STEPS.map((s) => {
              const isDone = done.includes(s.n);
              const isNext = next?.n === s.n;
              return (
                <li key={s.n} className={cn('flex items-start gap-3 rounded-lg px-2 py-2', isNext && 'bg-teal-900/5')}>
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                      isDone ? 'bg-teal-900 text-white' : 'border border-line text-muted',
                    )}
                    aria-label={isDone ? `Step ${s.n} done` : `Step ${s.n}`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink">{s.title}</div>
                    <div className="text-xs text-muted">{s.detail}</div>
                  </div>
                  <button type="button" onClick={() => go(s)} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-teal-900 hover:bg-teal-900/10">
                    Go
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="text-xs text-muted">Viewing as {role}</span>
            <Button variant="outline" size="sm" onClick={() => { reset(); router.push('/'); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo
            </Button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-full bg-teal-900 px-4 text-sm text-white shadow-lg hover:bg-teal-700"
      >
        <Compass className="h-4 w-4" />
        Demo guide
        {next && <span className="rounded-full bg-white/20 px-1.5 text-xs">{next.n}/9</span>}
      </button>
    </div>
  );
}
