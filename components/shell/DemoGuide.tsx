'use client';

import { useEffect, useState } from 'react';
import { Check, Compass, RotateCcw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type Role, STORY_REDLINE, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '../ui';

const BOARD = '/redlines/RL-CLOUDDESK';

export const DEMO_STEPS: { n: number; role: Role; title: string; detail: string; href: string }[] = [
  { n: 1, role: 'lead', title: 'Dashboard → Review CloudDesk’s changes', detail: 'You’re Riya; CloudDesk proposed six changes to the ₹60 lakh renewal', href: '/' },
  { n: 2, role: 'lead', title: 'Analyse six changes', detail: 'Three affect what you pay, one needs legal review, two are routine', href: `${BOARD}?tab=changes` },
  { n: 3, role: 'lead', title: 'Financial impact', detail: '₹13.3 lakh more a year than today; credits: ₹3.2 lakh', href: `${BOARD}?tab=tags` },
  { n: 4, role: 'lead', title: 'Try 15 days on credits, save as your draft', detail: '₹2.4 lakh · no own contracts · 27 participating companies', href: `${BOARD}?tab=tags` },
  { n: 5, role: 'lead', title: 'Compare offers, send for approval', detail: 'Pay 15 days sooner and get automatic credits back', href: `${BOARD}?tab=packages` },
  { n: 6, role: 'owner', title: 'Business owner approves; Finance decides', detail: 'The panel at the top says whose turn it is', href: '/approvals' },
  { n: 7, role: 'supplier', title: 'Preview, send, then view as CloudDesk', detail: 'Pick an offer and suggest a 7% cap. No ₹ shown', href: '/portal/clouddesk' },
  { n: 8, role: 'lead', title: 'Accept the counter', detail: '₹1.1 lakh, inside your ₹1.5 lakh range', href: BOARD },
  { n: 9, role: 'lead', title: 'Send for signature', detail: 'Signed commercial terms with an automated check: 62% → 66%', href: `${BOARD}?tab=signing` },
  { n: 10, role: 'lead', title: 'Run the first invoice check', detail: '₹25,000 credit required, ₹0 on the invoice, follow-up assigned', href: `${BOARD}?tab=signing` },
];

export function DemoGuide() {
  const [open, setOpen] = useState(false);
  // "Walk me through the demo" links elsewhere open the guide.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('open-demo-guide', show);
    return () => window.removeEventListener('open-demo-guide', show);
  }, []);
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
              <div className="text-[15px] text-teal-title">Walk me through the demo</div>
              <div className="text-xs text-muted">Optional. The button at the top of each screen is enough. · {status.replace('_', ' ')}</div>
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
        className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-xs text-teal-900 shadow-md hover:bg-page-bg"
      >
        <Compass className="h-4 w-4" />
        Walk me through the demo
        {next && open && <span className="rounded-full bg-teal-900/10 px-1.5">{next.n}/{DEMO_STEPS.length}</span>}
      </button>
    </div>
  );
}
