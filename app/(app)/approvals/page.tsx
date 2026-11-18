'use client';

import { Bot, Check, CheckCircle2, MessageCircleQuestion, X } from 'lucide-react';
import Link from 'next/link';
import { useSwitchRole } from '@/components/shell/RoleSwitcher';
import { Button, EmptyState, PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { formatLakh } from '@/lib/format';
import { atLeast, useDemo } from '@/lib/store';

function OwnerCard() {
  const s = useDemo();
  const packages = buildPackages().filter((p) => s.selectedPackages.includes(p.id));
  const maxProtect = Math.max(...packages.map((p) => p.protectedLakh));
  const gives = [...new Set(packages.flatMap((p) => p.gives.map((g) => g.id)))];
  const giveText = [gives.includes('term_3y') && 'a 3-year term', gives.includes('payment_30') && 'faster payment', (gives.includes('notice_60') || gives.includes('claim_30_autofiled')) && 'a middle ground on notice and claims']
    .filter(Boolean)
    .join(' or ');
  const waiting = s.status === 'awaiting_approval' && !s.ownerApproved;
  const done = s.ownerApproved || atLeast(s.status, 'approved');

  if (!atLeast(s.status, 'awaiting_approval')) {
    return <EmptyState title="Nothing waiting for you">The procurement lead has not sent CloudDesk packages for approval yet.</EmptyState>;
  }

  return (
    <div className="max-w-xl rounded-xl border border-[#e1dfdd] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#edebe9] px-4 py-2.5 text-xs text-[#605e5c]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-900 text-white"><Bot className="h-3.5 w-3.5" /></span>
        <span className="font-semibold text-[#242424]">Cost of Yes</span>
        <span>· in Teams · just now</span>
      </div>
      <div className="px-5 py-4">
        <h2 className="text-[16px] font-semibold text-[#242424]">CloudDesk renewal: approve {packages.length} package{packages.length === 1 ? '' : 's'}?</h2>
        <ul className="mt-3 space-y-2 text-sm text-[#242424]">
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> Get back up to {formatLakh(maxProtect)} a year</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> We may give {giveText}</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> Legal is handling 1 change separately</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {packages.map((p) => (
            <StatusPill key={p.id} tone="grey">{p.id} · {p.name} · protects {formatLakh(p.protectedLakh)}</StatusPill>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[#edebe9] px-5 py-3">
        {done ? (
          <span className="flex items-center gap-1.5 text-sm text-teal-900"><CheckCircle2 className="h-4 w-4" /> You approved this</span>
        ) : (
          <>
            <Button onClick={s.approveOwner} disabled={!waiting}>Approve</Button>
            <Button variant="outline" disabled title="Not part of this prototype">
              <MessageCircleQuestion className="h-4 w-4" /> Ask a question
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function FinanceTable() {
  const s = useDemo();
  const packages = buildPackages().filter((p) => s.selectedPackages.includes(p.id) || p.id === 'A');
  const offered = (id: string) => s.selectedPackages.includes(id as 'A');

  if (!atLeast(s.status, 'awaiting_approval')) {
    return <EmptyState title="Nothing waiting for finance">Gives that need finance appear here once packages are sent for approval.</EmptyState>;
  }

  return (
    <SirionCard title="Gives needing finance · CloudDesk" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-6 py-3 font-normal">Package</th>
              <th className="px-3 py-3 font-normal">Give</th>
              <th className="px-3 py-3 font-normal">Why finance</th>
              <th className="px-6 py-3 text-right font-normal">Decision</th>
            </tr>
          </thead>
          <tbody>
            {packages.flatMap((p) =>
              p.gives
                .filter((g) => g.needsFinance || g.cashCostLakh > 0)
                .map((g) => {
                  const needs = g.needsFinance && offered(p.id);
                  return (
                    <tr key={p.id + g.id} className={'h-14 border-t border-line ' + (needs ? '' : 'text-muted')}>
                      <td className="px-6">{p.id} · {p.name}</td>
                      <td className="px-3">{g.label}{g.commitmentLakh ? ` · ${formatLakh(g.commitmentLakh)} commitment` : ''}</td>
                      <td className="px-3">{g.financeReason}</td>
                      <td className="px-6 text-right">
                        {!needs ? (
                          <span className="text-xs">{offered(p.id) ? 'No finance step' : 'Not offered'}</span>
                        ) : s.financeDecision ? (
                          <StatusPill tone={s.financeDecision.A === 'approved' ? 'teal' : 'danger'}>
                            {s.financeDecision.A === 'approved' ? 'Approved' : 'Rejected'}
                          </StatusPill>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => s.decideFinance('approved')}><Check className="h-3.5 w-3.5" /> Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => s.decideFinance('rejected')}><X className="h-3.5 w-3.5" /> Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }),
            )}
          </tbody>
        </table>
      </div>
    </SirionCard>
  );
}

export default function ApprovalsPage() {
  const role = useDemo((s) => s.role);
  const status = useDemo((s) => s.status);
  const ownerApproved = useDemo((s) => s.ownerApproved);
  const financeDecision = useDemo((s) => s.financeDecision);
  const switchRole = useSwitchRole();

  const showOwner = role === 'owner' || role === 'lead' || role === 'legal';
  const showFinance = role === 'finance' || role === 'lead';

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle={role === 'finance' ? 'Only gives that commit money beyond a year, or cost more than ₹5 lakh a year, need finance.' : 'Short, plain approval requests. The numbers come from the price engine.'}
      />
      <div className="space-y-8">
        {showOwner && (
          <section>
            {role !== 'owner' && <h2 className="mb-3 text-sm text-muted">Business owner</h2>}
            <OwnerCard />
            {role === 'owner' && ownerApproved && status === 'awaiting_approval' && !financeDecision && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                Package A also needs finance.
                <Button size="sm" variant="outline" onClick={() => switchRole('finance', '/approvals')}>View as finance</Button>
              </div>
            )}
          </section>
        )}
        {showFinance && (
          <section>
            {role !== 'finance' && <h2 className="mb-3 text-sm text-muted">Finance</h2>}
            <FinanceTable />
          </section>
        )}
        {atLeast(status, 'approved') && role !== 'lead' && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-900/30 bg-teal-900/[0.06] px-5 py-3 text-sm text-teal-title">
            All approvals are in. The lead can now send the packages to CloudDesk.
            <Button size="sm" onClick={() => switchRole('lead', '/redlines/RL-CLOUDDESK?tab=packages')}>Back to the lead’s board</Button>
          </div>
        )}
        {role === 'lead' && (
          <p className="text-sm text-muted">
            You are viewing as the procurement lead. Switch role to approve, or go back to the <Link href="/redlines/RL-CLOUDDESK" className="text-teal-900 underline">board</Link>.
          </p>
        )}
      </div>
    </>
  );
}
