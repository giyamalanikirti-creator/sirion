'use client';

import { useState } from 'react';
import { Check, Compass, RotateCcw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type Role, STORY_REDLINE, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '../ui';

const BOARD = '/redlines/RL-CLOUDDESK';

export const DEMO_STEPS: { n: number; role: Role; title: string; detail: string; href: string }[] = [
  { n: 1, role: 'lead', title: 'Dashboard → Review supplier changes', detail: 'CloudDesk returned the ₹60 lakh renewal with six edits', href: '/' },
  { n: 2, role: 'lead', title: 'Sort the changes', detail: 'Routine edits fold away; the 10-day claim rises to the top', href: `${BOARD}?tab=changes` },
  { n: 3, role: 'lead', title: 'Price tags: why 10 days costs ₹3.2 lakh', detail: 'Current wording vs CloudDesk’s ask vs benchmark', href: `${BOARD}?tab=tags` },
  { n: 4, role: 'lead', title: 'Try a 15-day claim window, save as draft', detail: '₹2.4 lakh vs ₹3.2 lakh · 0 own contracts · pooled, 27 companies', href: `${BOARD}?tab=tags` },
  { n: 5, role: 'lead', title: 'Packages: compare, then send for approval', detail: 'B trades faster payment for automatic credits', href: `${BOARD}?tab=packages` },
  { n: 6, role: 'owner', title: 'Owner approves; finance decides on A', detail: 'B’s give is under the ₹5 lakh limit', href: '/approvals' },
  { n: 7, role: 'supplier', title: 'Supplier picks B, suggests a 7% cap', detail: 'No ₹ shown to the supplier', href: '/portal/clouddesk' },
  { n: 8, role: 'lead', title: 'Accept the counter', detail: '₹1.1 lakh, inside the ₹1.5 lakh range', href: BOARD },
  { n: 9, role: 'lead', title: 'Signing → Send for signature', detail: '3 of 3 commercial terms get an automated check', href: `${BOARD}?tab=signing` },
  { n: 10, role: 'lead', title: 'First invoice check', detail: 'Credit expected ₹25,000 · found ₹0 · owner assigned', href: `${BOARD}?tab=signing` },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const done = useDemo((s) => s.completedSteps);
  const status = useDemo((s) => s.negotiations[STORY_REDLINE]?.status ?? 'received');
    const setRole = useDemo((s) => s.setRole);
  const reset = useDemo((s) => s.reset);

  // Step 5 needs finance after the owner: route to the right role.
  const go = (step: (typeof DEMO_STEPS)[number]) => {
    let r = step.role;
    if (step.n === 6) r = useDemo.getState().negotiations[STORY_REDLINE]?.ownerApproved ? 'finance' : 'owner';
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
              <div className="text-xs text-muted">CloudDesk story · about 3 minutes · {status.replace('_', ' ')}</div>
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
            <button type="button" onClick={() => { setRole('lead'); router.push('/insights'); setOpen(false); }} className="text-xs text-teal-900 hover:underline">
              Afterwards: Insights →
            </button>
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
        {next && <span className="rounded-full bg-white/20 px-1.5 text-xs">{next.n}/{DEMO_STEPS.length}</span>}
      </button>
    </div>
  );
}
