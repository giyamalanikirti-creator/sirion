'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Check, RotateCcw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type Role, STORY_REDLINE, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '../ui';

const BOARD = '/redlines/RL-CLOUDDESK';

export const DEMO_STEPS: { n: number; role: Role; title: string; detail: string; href: string }[] = [
  { n: 1, role: 'lead', title: 'Overview → Review the 6 changes', detail: 'CloudDesk proposed six changes to your ₹60 lakh renewal', href: '/' },
  { n: 2, role: 'lead', title: 'Analyse 6 changes', detail: 'Three affect what you pay, one needs legal review, two are routine', href: `${BOARD}?tab=changes` },
  { n: 3, role: 'lead', title: 'Review financial impact', detail: '₹13.3 lakh a year more than your current contract', href: `${BOARD}?tab=tags` },
  { n: 4, role: 'lead', title: 'Try 15 days → Save to draft offer', detail: '₹2.4 lakh · 27 participating companies · low confidence', href: `${BOARD}?tab=tags` },
  { n: 5, role: 'lead', title: 'Compare offers → send for approval', detail: 'The table aligns what you give, get and commit', href: `${BOARD}?tab=packages` },
  { n: 6, role: 'owner', title: 'Business owner approves; Finance decides', detail: 'The status strip says whose turn it is', href: '/approvals' },
  { n: 7, role: 'supplier', title: 'Preview supplier view → send → view as supplier', detail: 'Pick an offer and suggest a 7% cap. No ₹ shown', href: '/portal/clouddesk' },
  { n: 8, role: 'lead', title: 'Review the counteroffer', detail: '₹1.1 lakh, inside your ₹1.5 lakh range', href: BOARD },
  { n: 9, role: 'lead', title: 'Send for signature', detail: 'Signed terms with an automated check: 62% → 66%', href: `${BOARD}?tab=signing` },
  { n: 10, role: 'lead', title: 'Check the first invoice', detail: '₹25,000 expected, ₹0 found, follow-up assigned', href: `${BOARD}?tab=signing` },
];

/** The optional walkthrough. Opened from Help; a first-time user can finish without it. */
export function DemoGuide() {
  const router = useRouter();
  const open = useDemo((s) => s.guideOpen);
  const setOpen = useDemo((s) => s.setGuideOpen);
  const done = useDemo((s) => s.completedSteps);
  const setRole = useDemo((s) => s.setRole);
  const reset = useDemo((s) => s.reset);

  const go = (step: (typeof DEMO_STEPS)[number]) => {
    let r = step.role;
    if (step.n === 6) r = useDemo.getState().negotiations[STORY_REDLINE]?.ownerApproved ? 'finance' : 'owner';
    setRole(r);
    router.push(step.href);
    setOpen(false);
  };
  const next = DEMO_STEPS.find((s) => !done.includes(s.n));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,400px)] flex-col border-l border-line bg-white shadow-[var(--shadow-float)] outline-none">
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-ink">Walk me through the demo</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                Optional. The primary button on each screen is enough. Step {next?.n ?? DEMO_STEPS.length} of {DEMO_STEPS.length}.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted hover:bg-page-bg" aria-label="Close walkthrough">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <ol className="flex-1 overflow-y-auto px-3 py-2">
            {DEMO_STEPS.map((s) => {
              const isDone = done.includes(s.n);
              const isNext = next?.n === s.n;
              return (
                <li key={s.n} className={cn('flex items-start gap-3 rounded-md px-2 py-2.5', isNext && 'bg-teal-tint')}>
                  <span
                    className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]', isDone ? 'bg-positive text-white' : 'border border-line text-muted')}
                    aria-label={isDone ? `Step ${s.n} done` : `Step ${s.n}`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-ink">{s.title}</div>
                    <div className="text-[12px] text-muted">{s.detail}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => go(s)}>Go</Button>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <button type="button" onClick={() => { setRole('lead'); router.push('/insights'); setOpen(false); }} className="text-[13px] text-teal-900 hover:underline">
              Afterwards: Insights
            </button>
            <Button variant="outline" size="sm" onClick={() => { reset(); setOpen(false); router.push('/'); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset demo
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
