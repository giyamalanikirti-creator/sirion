'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Compass, Database, X } from 'lucide-react';
import { getContract, getRedline, redlines } from '@/lib/data';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatDate, formatLakh } from '@/lib/format';
import { inWords, nextStep } from '@/lib/nextStep';
import { STORY_REDLINE, useDemo, useNegotiation } from '@/lib/store';
import { cn } from '@/lib/utils';
import { StatusPill } from '../ui';
import { DataUsePanel } from './DataUsePanel';

const BOARD = `/redlines/${STORY_REDLINE}`;
export const openDemoGuide = () => window.dispatchEvent(new Event('open-demo-guide'));

/** First visit: who you are, what you are deciding, and one button. */
function Welcome() {
  const dismiss = useDemo((s) => s.dismissWelcome);
  const r = getRedline(STORY_REDLINE);
  const c = getContract(r.contractId);
  return (
    <section className="overflow-hidden rounded-2xl bg-teal-900 text-white shadow-card">
      <div className="px-6 py-7 md:px-8">
        <span className="inline-flex rounded-full border border-white/30 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/80">Fictional demo data</span>
        <h2 className="mt-3 text-[24px] font-normal leading-snug">You’re Riya, the procurement lead.</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/85">
          Your company pays {c.supplier} {formatLakh(c.annualFeeInr / 1e5)} a year for helpdesk software. {c.supplier} has proposed{' '}
          {inWords(r.changes.length)} changes to renew the contract. Your job is to decide which terms to accept and what to negotiate.
        </p>
        <div className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-white/60">The question to answer</div>
          <div className="mt-0.5 text-[15px]">“{c.supplier} wants to change our renewal terms. Which changes should I accept, and what should I ask for in return?”</div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href={`${BOARD}?tab=changes`}
            onClick={dismiss}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-teal-900 hover:bg-white/90"
          >
            Review {c.supplier}’s changes <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-white/70">
            {c.supplier} returned your {formatLakh(c.annualFeeInr / 1e5)} renewal with {r.changes.length} edits · received {formatDate(r.receivedAt)}
          </span>
        </div>
        <button type="button" onClick={openDemoGuide} className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white">
          <Compass className="h-3.5 w-3.5" /> Walk me through the demo
        </button>
      </div>
    </section>
  );
}

/** Returning visit: the story redline's next step, in one line and one button. */
function StoryTask({ onShowData }: { onShowData: () => void }) {
  const n = useNegotiation(STORY_REDLINE);
  const step = nextStep(STORY_REDLINE, n);
  const r = getRedline(STORY_REDLINE);
  const c = getContract(r.contractId);
  const { vsCurrentLakh } = redlinePriceTags(STORY_REDLINE);
  const tab =
    n.status === 'received' ? 'changes' : n.status === 'sorted' ? 'tags' : ['priced', 'packages_ready'].includes(n.status) ? 'packages' : ['agreed', 'signed'].includes(n.status) ? 'signing' : 'changes';
  const title = n.status === 'received' ? `${c.supplier} returned your ${formatLakh(c.annualFeeInr / 1e5)} renewal with ${r.changes.length} edits` : step.title;
  const sub =
    n.status === 'received'
      ? 'Decide which terms to accept and what to ask for in return.'
      : n.sortResult && n.status !== 'signed'
        ? `Accepting all of ${c.supplier}’s commercial changes could cost an estimated ${formatLakh(vsCurrentLakh)} more per year than your current contract.`
        : step.detail;
  return (
    <section className="overflow-hidden rounded-2xl bg-teal-900 text-white shadow-card">
      <div className="flex flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">{step.whose} · {c.supplier} renewal</div>
          <h2 className="mt-1 max-w-2xl text-[21px] font-normal leading-snug">{title}</h2>
          {sub && <p className="mt-2 max-w-2xl text-sm text-white/75">{sub}</p>}
          <button type="button" onClick={onShowData} className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white">
            <Database className="h-3.5 w-3.5" /> How this workspace uses data
          </button>
        </div>
        <Link
          href={`${BOARD}?tab=${tab}`}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-teal-900 hover:bg-white/90"
        >
          {n.status === 'received' ? `Review ${c.supplier}’s changes` : `Open ${c.supplier}`} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

const TURN_TONE = { you: 'teal', owner: 'lime', finance: 'lime', supplier: 'periwinkle', legal: 'indigo', sirion: 'mint', done: 'grey' } as const;

/** Every redline's next step: what returning users land on. */
function WorkQueue() {
  const negotiations = useDemo((s) => s.negotiations);
  const rows = redlines.map((r) => ({ r, step: nextStep(r.id, negotiations[r.id]) })).filter(({ step }) => step.turn !== 'done');
  const mine = rows.filter(({ step }) => step.turn === 'you').length;
  return (
    <section className="rounded-2xl border border-line bg-white shadow-card">
      <header className="mx-6 flex min-h-[56px] items-center justify-between border-b border-line">
        <h2 className="text-[15px] text-teal-title">Your work queue</h2>
        <span className="text-xs text-muted">{mine} waiting on you · {rows.length - mine} with others</span>
      </header>
      <ul className="divide-y divide-line">
        {rows.map(({ r, step }) => (
          <li key={r.id}>
            <Link href={`/redlines/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 hover:bg-page-bg/60">
              <span className="min-w-0">
                <span className="font-medium text-teal-900">{r.supplier}</span>
                <span className="ml-2 text-sm text-muted">{step.title}</span>
              </span>
              <StatusPill tone={TURN_TONE[step.turn]}>{step.whose}</StatusPill>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="px-6 py-4 text-sm text-muted">Nothing open. Every redline is signed.</li>}
      </ul>
    </section>
  );
}

export function FrontDoor() {
  const status = useNegotiation(STORY_REDLINE).status;
  const welcomeDismissed = useDemo((s) => s.welcomeDismissed);
  const firstVisit = status === 'received' && !welcomeDismissed;
  const [showData, setShowData] = useState(false);

  return (
    <div className="mb-6 space-y-6">
      {firstVisit ? (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
          <Welcome />
          <DataUsePanel />
        </div>
      ) : (
        <>
          <StoryTask onShowData={() => setShowData(true)} />
          <WorkQueue />
        </>
      )}
      <Dialog.Root open={showData} onOpenChange={setShowData}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
          <Dialog.Content className={cn('fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 outline-none')}>
            <Dialog.Title className="sr-only">How this workspace uses data</Dialog.Title>
            <Dialog.Description className="sr-only">Data sources and peer benchmark settings</Dialog.Description>
            <div className="relative">
              <DataUsePanel />
              <Dialog.Close className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-page-bg" aria-label="Close">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
