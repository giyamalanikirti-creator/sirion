'use client';

import Link from 'next/link';
import { Check, PenLine, X } from 'lucide-react';
import { Button, EmptyState, PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { redlines } from '@/lib/data';
import { legalChanges, useDemo } from '@/lib/store';

const NOTE: Record<string, string> = {
  'RL-CLOUDDESK:3': 'Liability cap stays at 12 months’ fees.',
};

export default function LegalPage() {
  const negotiations = useDemo((s) => s.negotiations);
  const decide = useDemo((s) => s.decideLegal);

  // A legal change reaches this queue once its redline has been sorted.
  const items = redlines.flatMap((r) =>
    negotiations[r.id]?.sortResult ? legalChanges(r.id).map((ch) => ({ r, ch, decision: negotiations[r.id].legalDecisions[ch.no] })) : [],
  );
  const waiting = items.filter((i) => !i.decision).length;
  const unsorted = redlines.filter((r) => !negotiations[r.id]?.sortResult && legalChanges(r.id).length);

  return (
    <>
      <PageHeader
        title="Legal queue"
        subtitle={`Legal changes are routed here and never block the money flow. ${waiting} waiting · ${items.length - waiting} decided.`}
      />
      <div className="space-y-4">
        {items.length === 0 && <EmptyState title="Nothing in the queue">Legal changes arrive here once a redline is sorted.</EmptyState>}
        {items.map(({ r, ch, decision }) => (
          <SirionCard
            key={r.id + ch.no}
            title={`${r.supplier} · clause ${ch.clause} · ${ch.title}`}
            action={decision ? <StatusPill tone={decision === 'rejected' ? 'danger' : 'teal'}>{decision}</StatusPill> : <StatusPill tone="indigo">Waiting on legal</StatusPill>}
          >
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Current</div>
                <p>{ch.oldText}</p>
              </div>
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">{r.supplier} proposes</div>
                <p>{ch.newText}</p>
              </div>
            </div>
            {decision === 'rejected' && (
              <p className="mt-4 rounded-lg bg-page-bg px-3 py-2 text-sm">
                Note to supplier: {NOTE[`${r.id}:${ch.no}`] ?? 'We keep the current wording for this clause.'}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" onClick={() => decide(r.id, ch.no, 'accepted')} disabled={!!decision}><Check className="h-4 w-4" /> Accept</Button>
              <Button variant="danger" onClick={() => decide(r.id, ch.no, 'rejected')} disabled={!!decision}><X className="h-4 w-4" /> Reject</Button>
              <Button variant="outline" onClick={() => decide(r.id, ch.no, 'redlined')} disabled={!!decision}><PenLine className="h-4 w-4" /> Redline</Button>
              <Link href={`/redlines/${r.id}`} className="ml-auto text-sm text-teal-900 hover:underline">Open the redline</Link>
            </div>
          </SirionCard>
        ))}
        {unsorted.length > 0 && (
          <p className="text-sm text-muted">Not sorted yet, so not in the queue: {unsorted.map((r) => r.supplier).join(', ')}.</p>
        )}
      </div>
    </>
  );
}
