'use client';

import { Check, PenLine, X } from 'lucide-react';
import { Button, PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { getRedline } from '@/lib/data';
import { useDemo } from '@/lib/store';

export default function LegalPage() {
  const decision = useDemo((s) => s.legalDecision);
  const decide = useDemo((s) => s.decideLegal);
  const ch = getRedline('RL-CLOUDDESK').changes.find((c) => c.expected.group === 'legal')!;

  return (
    <>
      <PageHeader title="Legal queue" subtitle="Legal changes are routed here and never block the money flow." />
      <SirionCard
        title={`CloudDesk · clause ${ch.clause} · ${ch.title}`}
        action={decision ? <StatusPill tone={decision === 'rejected' ? 'danger' : 'teal'}>{decision}</StatusPill> : <StatusPill tone="indigo">Waiting on legal</StatusPill>}
      >
        <div className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Current</div>
            <p>{ch.oldText}</p>
          </div>
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">CloudDesk proposes</div>
            <p>{ch.newText}</p>
          </div>
        </div>
        {decision === 'rejected' && (
          <p className="mt-4 rounded-lg bg-page-bg px-3 py-2 text-sm">Note to supplier: Liability cap stays at 12 months’ fees.</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={() => decide('accepted')} disabled={!!decision}><Check className="h-4 w-4" /> Accept</Button>
          <Button variant="danger" onClick={() => decide('rejected')} disabled={!!decision}><X className="h-4 w-4" /> Reject</Button>
          <Button variant="outline" onClick={() => decide('redlined')} disabled={!!decision}><PenLine className="h-4 w-4" /> Redline</Button>
        </div>
      </SirionCard>
    </>
  );
}
