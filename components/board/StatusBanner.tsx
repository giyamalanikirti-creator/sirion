'use client';

import { ArrowRight, Clock, Handshake, Send } from 'lucide-react';
import { useSwitchRole } from '@/components/shell/RoleSwitcher';
import { Button } from '@/components/ui';
import { priceCounter } from '@/lib/engines/negotiation';
import { formatLakh } from '@/lib/format';
import { needsFinanceStep, useDemo } from '@/lib/store';

export function StatusBanner({ onGoSigning }: { onGoSigning: () => void }) {
  const s = useDemo();
  const switchRole = useSwitchRole();

  if (s.status === 'awaiting_approval') {
    const next = !s.ownerApproved ? 'owner' : needsFinanceStep(s.selectedPackages) && !s.financeDecision ? 'finance' : null;
    return (
      <Banner icon={<Clock className="h-4 w-4" />}>
        <span>
          Waiting for {next === 'finance' ? 'finance approval of package A' : 'the business owner to approve'}.
        </span>
        {next && (
          <Button size="sm" variant="outline" onClick={() => switchRole(next, '/approvals')}>
            View as {next === 'owner' ? 'business owner' : 'finance'} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </Banner>
    );
  }
  if (s.status === 'approved') {
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>
          Approved: packages {s.selectedPackages.join(', ')} can go to CloudDesk.
          {s.financeDecision?.A === 'rejected' && ' Finance rejected A, so it is not offered.'}
        </span>
        <Button size="sm" onClick={s.sendToSupplier}>
          <Send className="h-3.5 w-3.5" /> Send to CloudDesk
        </Button>
      </Banner>
    );
  }
  if (s.status === 'with_supplier') {
    return (
      <Banner icon={<Clock className="h-4 w-4" />}>
        <span>With CloudDesk. They see the packages and plain reasons, never our ₹ figures.</span>
        <Button size="sm" variant="outline" onClick={() => switchRole('supplier')}>
          Open supplier portal <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Banner>
    );
  }
  if (s.status === 'countered' && s.counter && s.supplierPick) {
    const c = priceCounter('price', 'cap_5', s.counter.group);
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>
          CloudDesk picked <strong>{s.supplierPick}</strong> and asked for a 7% price cap: <strong>{formatLakh(c.extraLakh)} a year more</strong>,{' '}
          {c.insideRange ? `inside your ${formatLakh(c.rangeLakh)} range` : `outside your ${formatLakh(c.rangeLakh)} range`}.
        </span>
        <Button size="sm" onClick={() => s.acceptCounter().ok && onGoSigning()}>
          Accept
        </Button>
      </Banner>
    );
  }
  if (s.status === 'agreed') {
    return (
      <Banner icon={<Handshake className="h-4 w-4" />} tone="teal">
        <span>Agreed with CloudDesk on package {s.supplierPick}{s.counter ? ' with a 7% cap' : ''}. Ready to sign.</span>
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
