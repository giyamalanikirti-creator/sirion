'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, CheckCircle2, Clock, Eye, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { SupplierOfferCard } from '@/components/SupplierOfferCard';
import { useSwitchRole } from '@/components/shell/RoleSwitcher';
import { Button } from '@/components/ui';
import { getRedline } from '@/lib/data';
import { nextStep, type Turn } from '@/lib/nextStep';
import { offersFor } from '@/lib/offers';
import { SortResponseSchema } from '@/lib/schemas';
import type { SortResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';

export type BoardTab = 'changes' | 'tags' | 'packages' | 'signing';

const TURN_TONE: Record<Turn, string> = {
  you: 'bg-teal-900 text-white',
  owner: 'bg-lime/60 text-[#4a4c0e]',
  finance: 'bg-lime/60 text-[#4a4c0e]',
  supplier: 'bg-periwinkle/25 text-[#3d44a8]',
  legal: 'bg-indigo/15 text-indigo',
  sirion: 'bg-mint/70 text-teal-title',
  done: 'bg-mint/70 text-teal-title',
};

/** Runs the analysis (sort + price) for a redline. */
export function useAnalyse() {
  const { id, sort } = useBoard();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/sort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ redlineId: id }) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Analysis failed');
      sort(SortResponseSchema.parse(await res.json()) as SortResult);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

/** "Preview what the supplier will see": the same cards the portal renders, read-only. */
function SupplierPreview({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { id, n } = useBoard();
  const r = getRedline(id);
  const offers = offersFor(id, n).filter((p) => n.selectedPackages.includes(p.id)).sort((a, b) => a.id.localeCompare(b.id));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed inset-x-4 top-8 bottom-8 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f7f8f8] shadow-2xl outline-none">
          <div className="flex items-start justify-between border-b border-line bg-white px-6 py-4">
            <div>
              <Dialog.Title className="text-[17px] text-ink">Preview: what {r.supplier} will see</Dialog.Title>
              <Dialog.Description className="text-sm text-muted">
                Plain terms and a reason for each. No ₹ figures, no estimates, no peer data, no internal notes.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-muted hover:bg-page-bg" aria-label="Close preview">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className={cn('grid flex-1 gap-4 overflow-y-auto p-6', offers.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
            {offers.map((p) => <SupplierOfferCard key={p.id} p={p} reasons={{}} as="div" />)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The one next action on the board: whose turn it is, what they are deciding,
 * and what happens next. Sticky, so it is always the clearest control.
 */
export function NextStepPanel({ onGoTab }: { onGoTab: (t: BoardTab) => void }) {
  const b = useBoard();
  const { id, n } = b;
  const step = nextStep(id, n);
  const switchRole = useSwitchRole();
  const analyse = useAnalyse();
  const [preview, setPreview] = useState(false);
  const r = getRedline(id);

  const act = async () => {
    switch (step.action) {
      case 'analyse':
        if (await analyse.run()) onGoTab('changes');
        return;
      case 'impact':
        return onGoTab('tags');
      case 'offers':
        return onGoTab('packages');
      case 'sendApproval':
        return void b.sendForApproval();
      case 'viewOwner':
        return switchRole('owner', '/approvals');
      case 'viewFinance':
        return switchRole('finance', '/approvals');
      case 'sendSupplier':
        return void b.sendToSupplier();
      case 'viewSupplier':
        return switchRole('supplier', `/portal/${r.slug}`);
      case 'respondCounter':
        if (b.acceptCounter().ok) onGoTab('signing');
        return;
      case 'sign':
        onGoTab('signing');
        return void b.sign();
      case 'invoice':
        onGoTab('signing');
        return void b.runInvoiceCheck();
      case 'viewLegal':
        return switchRole('legal', '/legal');
    }
  };

  const waitingOnOthers = ['owner', 'finance', 'supplier', 'legal'].includes(step.turn);

  return (
    <section
      aria-label="Next step"
      className="sticky top-16 z-20 -mx-1 rounded-2xl border border-teal-900/25 bg-white/95 px-5 py-4 shadow-card backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', TURN_TONE[step.turn])}>
              {step.turn === 'done' ? <CheckCircle2 className="h-3 w-3" /> : waitingOnOthers ? <Clock className="h-3 w-3" /> : null}
              {step.whose}
            </span>
            <h2 className="text-[16px] font-normal text-ink">{step.title}</h2>
          </div>
          {(step.detail || step.next) && (
            <p className="mt-1 text-sm text-muted">
              {step.detail}
              {step.next && <span className="ml-1 text-ink/70">Next: {step.next}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {step.action === 'sendSupplier' && (
            <Button variant="outline" onClick={() => setPreview(true)}>
              <Eye className="h-4 w-4" /> Preview what {r.supplier} will see
            </Button>
          )}
          {step.action === 'respondCounter' && (
            <Button variant="outline" onClick={() => b.declineCounter().ok && onGoTab('signing')}>Decline</Button>
          )}
          {step.action && (
            <Button
              variant={waitingOnOthers ? 'outline' : 'primary'}
              onClick={act}
              disabled={analyse.busy}
              className={waitingOnOthers ? '' : 'h-10 px-5'}
              title={waitingOnOthers ? 'Demo shortcut: play the next person’s part' : undefined}
            >
              {analyse.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {analyse.busy ? 'Analysing…' : step.actionLabel}
              {!analyse.busy && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      <SupplierPreview open={preview} onOpenChange={setPreview} />
    </section>
  );
}
