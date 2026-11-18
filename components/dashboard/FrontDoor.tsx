'use client';

import Link from 'next/link';
import { ArrowRight, Clock, FileText } from 'lucide-react';
import { DemoLabel, StatusPill } from '@/components/ui';
import { callName } from '@/lib/account';
import { getContract, getRedline, redlines } from '@/lib/data';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatLakh } from '@/lib/format';
import { type ActionId, nextStep, inWords } from '@/lib/nextStep';
import { STORY_REDLINE, useDemo, useNegotiation } from '@/lib/store';
import { cn } from '@/lib/utils';

const BOARD = `/redlines/${STORY_REDLINE}`;

/** The task heading for each stage of the story negotiation. */
const HEADING: Partial<Record<ActionId, string>> = {
  analyse: 'Review CloudDesk’s renewal',
  impact: 'Review financial impact',
  offers: 'Compare offers',
  sendApproval: 'Send offers for approval',
  viewOwner: 'Waiting for approval',
  viewFinance: 'Waiting for Finance',
  sendSupplier: 'Send offers to CloudDesk',
  viewSupplier: 'Waiting for CloudDesk',
  respondCounter: 'Review supplier counteroffer',
  sign: 'Send for signature',
  invoice: 'Check first invoice',
};

const TAB_FOR: Partial<Record<ActionId, string>> = {
  analyse: 'changes', impact: 'tags', offers: 'packages', sendApproval: 'packages', viewOwner: 'packages', viewFinance: 'packages',
  sendSupplier: 'packages', viewSupplier: 'packages', respondCounter: 'packages', sign: 'signing', invoice: 'signing',
};

/** The active negotiation: the dashboard's focal point. */
export function ActiveTask() {
  const n = useNegotiation(STORY_REDLINE);
  const profile = useDemo((s) => s.profile);
  const step = nextStep(STORY_REDLINE, n);
  const r = getRedline(STORY_REDLINE);
  const c = getContract(r.contractId);
  const { vsCurrentLakh } = redlinePriceTags(STORY_REDLINE);
  const fresh = n.status === 'received';
  const othersTurn = ['owner', 'finance', 'supplier', 'legal'].includes(step.turn);
  const heading = step.turn === 'done' ? `${c.supplier} renewal signed` : HEADING[step.action ?? 'analyse'] ?? step.title;
  const href = `${BOARD}?tab=${TAB_FOR[step.action ?? 'analyse'] ?? 'changes'}`;

  return (
    <section aria-labelledby="active-task" className="relative overflow-hidden rounded-lg border border-line bg-white">
      <span className="absolute inset-y-0 left-0 w-1 bg-teal-900" aria-hidden />
      <div className="px-6 py-5 pl-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-tint text-teal-900"><FileText className="h-4 w-4" /></span>
          <span className="text-[13px] text-muted">{c.supplier} · helpdesk software · {formatLakh(c.annualFeeInr / 1e5)} a year</span>
          <StatusPill tone={othersTurn ? 'proposed' : step.turn === 'done' ? 'positive' : 'teal'}>{step.whose}</StatusPill>
          <DemoLabel className="ml-auto" />
        </div>
        <h2 id="active-task" className="mt-3 text-[24px] font-semibold leading-tight tracking-tight text-ink">{heading}</h2>

        {fresh ? (
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink">
            You’re {profile.fullName}, the {profile.jobTitle.toLowerCase()}. Your company pays {c.supplier} {formatLakh(c.annualFeeInr / 1e5)} a year for helpdesk software.{' '}
            {c.supplier} has proposed {inWords(r.changes.length)} changes. Decide which to accept and what to ask for in return.
          </p>
        ) : (
          <div className="mt-2 max-w-[66ch] space-y-1">
            <p className="text-[15px] leading-relaxed text-ink">{step.title}.</p>
            {n.sortResult && n.status !== 'signed' && vsCurrentLakh > 0.005 && (
              <p className="text-[14px] text-muted">
                Accepting every commercial change could cost an estimated <span className="num font-semibold text-ink">{formatLakh(vsCurrentLakh)}</span> more per year than your current contract.
              </p>
            )}
            {step.detail && !(n.sortResult && n.status !== 'signed') && <p className="text-[14px] text-muted">{step.detail}</p>}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={href}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-md px-5 text-[15px] font-medium',
              othersTurn ? 'border border-line bg-white text-ink hover:bg-page-bg' : 'bg-teal-900 text-white hover:bg-teal-700',
            )}
          >
            {fresh ? `Review the ${r.changes.length} changes` : othersTurn ? `Open ${c.supplier}` : step.turn === 'done' ? `Open ${c.supplier}` : step.actionLabel ?? `Open ${c.supplier}`}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {othersTurn && <span className="inline-flex items-center gap-1.5 text-[13px] text-muted"><Clock className="h-4 w-4" /> {step.title}</span>}
          <Link href="/workspace" className="text-[13px] text-teal-900 hover:underline">How this workspace uses data</Link>
        </div>
      </div>
      <span className="sr-only">Signed in as {callName(profile)}</span>
    </section>
  );
}

const TURN_TONE = { you: 'teal', owner: 'proposed', finance: 'proposed', supplier: 'proposed', legal: 'current', sirion: 'positive', done: 'grey' } as const;

/** The other open negotiations, compact. */
export function OtherNegotiations() {
  const negotiations = useDemo((s) => s.negotiations);
  const rows = redlines
    .filter((r) => r.id !== STORY_REDLINE)
    .map((r) => ({ r, step: nextStep(r.id, negotiations[r.id]) }))
    .filter(({ step }) => step.turn !== 'done');
  return (
    <section aria-labelledby="other-negs" className="rounded-lg border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id="other-negs" className="text-[16px] font-semibold text-ink">Other negotiations</h2>
        <Link href="/redlines" className="text-[13px] text-teal-900 hover:underline">View all</Link>
      </header>
      <ul className="divide-y divide-line">
        {rows.map(({ r, step }) => (
          <li key={r.id}>
            <Link href={`/redlines/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-page-bg">
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-ink">{r.supplier}</span>
                <span className="block truncate text-[12px] text-muted">{step.title}</span>
              </span>
              <StatusPill tone={TURN_TONE[step.turn]}>{step.turn === 'you' ? 'You' : step.whose.replace('’s turn', '')}</StatusPill>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-5 py-4 text-[14px] text-muted">No other open negotiations.</li>}
      </ul>
    </section>
  );
}
