'use client';

import { ArrowRight, Clock, Handshake, Send } from 'lucide-react';
import { useSwitchRole } from '@/components/shell/RoleSwitcher';
import { Button } from '@/components/ui';
import { getRedline } from '@/lib/data';
import { priceCounter, templateFor } from '@/lib/engines/negotiation';
import { pricePackage } from '@/lib/engines/givegetEngine';
import { changedLines, supplierAsk } from '@/lib/engines/redline';
import { getContract } from '@/lib/data';
import { COUNTER_PHRASE, formatLakh } from '@/lib/format';
import { financePackages, hasMoneyLines, legalChanges, needsFinanceStep } from '@/lib/store';
import { useBoard } from './context';

export function StatusBanner({ onGoSigning }: { onGoSigning: () => void }) {
  const { id, n, sendToSupplier, acceptCounter, declineCounter } = useBoard();
  const switchRole = useSwitchRole();
  const redline = getRedline(id);
  const name = redline.supplier;

  if (!hasMoneyLines(id) && n.sortResult && n.status !== 'signed') {
    const pending = legalChanges(id).filter((c) => !n.legalDecisions[c.no]).length;
    return (
      <Banner icon={<Clock className="h-4 w-4" />}>
        <span>{pending ? `Legal changes only: waiting for legal on ${pending} change${pending === 1 ? '' : 's'}.` : 'Legal has decided every change. Ready to sign.'}</span>
        {pending ? (
          <Button size="sm" variant="outline" onClick={() => switchRole('legal', '/legal')}>
            View as legal <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={onGoSigning}>Go to signing <ArrowRight className="h-3.5 w-3.5" /></Button>
        )}
      </Banner>
    );
  }

  if (n.status === 'awaiting_approval') {
    const fin = financePackages(id, n.selectedPackages);
    const next = !n.ownerApproved ? 'owner' : needsFinanceStep(id, n.selectedPackages) && !n.financeDecision ? 'finance' : null;
    return (
      <Banner icon={<Clock className="h-4 w-4" />}>
        <span>Waiting for {next === 'finance' ? `finance approval of package ${fin.join(', ')}` : 'the business owner to approve'}.</span>
        {next && (
          <Button size="sm" variant="outline" onClick={() => switchRole(next, '/approvals')}>
            View as {next === 'owner' ? 'business owner' : 'finance'} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </Banner>
    );
  }
  if (n.status === 'approved') {
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>
          Approved: package{n.selectedPackages.length === 1 ? '' : 's'} {n.selectedPackages.join(', ')} can go to {name}.
          {n.financeDecision === 'rejected' && ' Finance rejected the multi-year commitment, so it is not offered.'}
        </span>
        <Button size="sm" onClick={sendToSupplier}>
          <Send className="h-3.5 w-3.5" /> Send to {name}
        </Button>
      </Banner>
    );
  }
  if (n.status === 'with_supplier') {
    return (
      <Banner icon={<Clock className="h-4 w-4" />}>
        <span>With {name}. They see the packages and plain reasons, never our ₹ figures.</span>
        <Button size="sm" variant="outline" onClick={() => switchRole('supplier', `/portal/${redline.slug}`)}>
          Open supplier portal <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Banner>
    );
  }
  if (n.status === 'countered' && n.counter && n.supplierPick) {
    // Price the counter against the wording the picked package offered on that line.
    const c = getContract(redline.contractId);
    const pkg = pricePackage(c, supplierAsk(redline, c), templateFor(n.supplierPick, id), changedLines(redline));
    const from = pkg.wordings[n.counter.line];
    const pc = priceCounter(n.counter.line, from, n.counter.group, id);
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>
          {name} picked <strong>{n.supplierPick}</strong> and asked for {COUNTER_PHRASE[n.counter.group]}:{' '}
          <strong>{formatLakh(pc.extraLakh)} a year more</strong>,{' '}
          {pc.insideRange ? `inside your ${formatLakh(pc.rangeLakh)} range` : `outside your ${formatLakh(pc.rangeLakh)} range`}.
        </span>
        <span className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => declineCounter().ok && onGoSigning()}>
            Decline
          </Button>
          <Button size="sm" onClick={() => acceptCounter().ok && onGoSigning()}>
            Accept
          </Button>
        </span>
      </Banner>
    );
  }
  if (n.status === 'agreed') {
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>
          Agreed with {name} on package {n.supplierPick}
          {n.counter ? ` with ${COUNTER_PHRASE[n.counter.group]}` : ''}. Ready to sign.
        </span>
        <Button size="sm" onClick={onGoSigning}>
          Go to signing <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Banner>
    );
  }
  return null;
}

function Banner({ icon, tone = 'grey', children }: { icon: React.ReactNode; tone?: 'grey' | 'teal'; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-sm ' +
        (tone === 'teal' ? 'border-teal-900/30 bg-teal-900/[0.06] text-teal-title' : 'border-line bg-white text-ink')
      }
    >
      <div className="flex items-center gap-2">{icon}</div>
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  );
}
