'use client';

import { Bot, Check, CheckCircle2, MessageCircleQuestion, X } from 'lucide-react';
import Link from 'next/link';
import { useSwitchRole } from '@/components/shell/RoleSwitcher';
import { Button, EmptyState, PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { getContract, redlines } from '@/lib/data';
import { offersFor } from '@/lib/offers';
import { callName } from '@/lib/account';
import { formatLakh } from '@/lib/format';
import { atLeast, financePackages, legalChanges, needsFinanceStep, type Negotiation, useDemo } from '@/lib/store';
import type { Redline } from '@/lib/types';

function OwnerCard({ r, n }: { r: Redline; n: Negotiation }) {
  const approveOwner = useDemo((s) => s.approveOwner);
  const leadName = callName(useDemo((s) => s.profile));
  const packages = offersFor(r.id, n).filter((p) => n.selectedPackages.includes(p.id));
  const maxProtect = Math.max(...packages.map((p) => p.protectedLakh));
  const gives = [...new Set(packages.flatMap((p) => p.gives.map((g) => g.id)))];
  const giveText =
    [
      gives.includes('term_3y') && 'a 3-year term',
      gives.includes('payment_30') && 'faster payment',
      (gives.includes('notice_60') || gives.includes('claim_30_autofiled')) && 'a middle ground on notice or claims',
    ]
      .filter(Boolean)
      .join(' or ') || 'nothing in return';
  const legal = legalChanges(r.id).length;
  const waiting = n.status === 'awaiting_approval' && !n.ownerApproved;
  const done = n.ownerApproved || atLeast(n.status, 'approved');
  const c = getContract(r.contractId);

  return (
    <div className="max-w-xl rounded-md border border-[#e1dfdd] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#edebe9] px-4 py-2.5 text-xs text-[#605e5c]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-900 text-white"><Bot className="h-3.5 w-3.5" /></span>
        <span className="font-semibold text-[#242424]">Cost of Yes</span>
        <span>· in Teams · to {c.businessOwner}</span>
      </div>
      <div className="px-5 py-4">
        <h2 className="text-[16px] font-semibold text-[#242424]">
          {r.supplier} renewal: approve {packages.length} offer{packages.length === 1 ? '' : 's'} to send back?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[#242424]">
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> Get back up to {formatLakh(maxProtect)} a year</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> We may give {giveText}</li>
          {legal > 0 && (
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-teal-900" /> Legal is handling {legal} change{legal === 1 ? '' : 's'} separately</li>
          )}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {packages.map((p) => (
            <StatusPill key={p.id} tone="grey">{p.id} · {p.name} · protects {formatLakh(p.protectedLakh)}</StatusPill>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[#edebe9] px-5 py-3">
        {done ? (
          <span className="flex flex-wrap items-center gap-1.5 text-sm text-teal-900">
            <CheckCircle2 className="h-4 w-4" /> You approved this.
            <span className="text-muted">
              Next:{' '}
              {n.status === 'awaiting_approval'
                ? 'Finance decides on the three-year commitment.'
                : n.status === 'approved'
                  ? `${leadName} sends the offers to ${r.supplier}.`
                  : `${r.supplier} has the offers.`}
            </span>
          </span>
        ) : (
          <>
            <Button onClick={() => approveOwner(r.id)} disabled={!waiting}>Approve</Button>
            <Button variant="outline" disabled title="Not part of this prototype">
              <MessageCircleQuestion className="h-4 w-4" /> Ask a question
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Rows for every give across redlines in approval: multi-year commitments need finance; small cash gives are shown greyed. */
function FinanceTable({ items }: { items: { r: Redline; n: Negotiation }[] }) {
  const decideFinance = useDemo((s) => s.decideFinance);
  const rows = items.flatMap(({ r, n }) =>
    offersFor(r.id, n).flatMap((p) =>
      p.gives
        .filter((g) => g.needsFinance || g.cashCostLakh > 0)
        .map((g) => ({ r, n, p, g, offered: n.selectedPackages.includes(p.id), needs: g.needsFinance && n.selectedPackages.includes(p.id) })),
    ),
  );
  if (!rows.length) return <EmptyState title="Nothing waiting for finance">Gives that need Finance appear here once offers are sent for approval.</EmptyState>;

  return (
    <SirionCard title="Gives needing finance" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-6 py-3 font-normal">Supplier · offer</th>
              <th className="px-3 py-3 font-normal">Give</th>
              <th className="px-3 py-3 font-normal">Why finance</th>
              <th className="px-6 py-3 text-right font-normal">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, n, p, g, offered, needs }) => (
              <tr key={r.id + p.id + g.id} className={'h-14 border-t border-line ' + (needs ? '' : 'text-muted')}>
                <td className="px-6">
                  <div>{r.supplier}</div>
                  <div className="text-xs text-muted">{p.id} · {p.name}</div>
                </td>
                <td className="px-3">{g.label}{g.commitmentLakh ? ` · ${formatLakh(g.commitmentLakh)} commitment` : ''}</td>
                <td className="px-3">{g.financeReason}</td>
                <td className="px-6 text-right">
                  {!needs ? (
                    <span className="text-xs">{offered ? 'No finance step' : 'Not offered'}</span>
                  ) : n.financeDecision ? (
                    <StatusPill tone={n.financeDecision === 'approved' ? 'teal' : 'danger'}>{n.financeDecision === 'approved' ? 'Approved' : 'Rejected'}</StatusPill>
                  ) : n.status !== 'awaiting_approval' ? (
                    <span className="text-xs">Waiting for the lead</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => decideFinance(r.id, 'approved')}><Check className="h-3.5 w-3.5" /> Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => decideFinance(r.id, 'rejected')}><X className="h-3.5 w-3.5" /> Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SirionCard>
  );
}

export default function ApprovalsPage() {
  const role = useDemo((s) => s.role);
  const negotiations = useDemo((s) => s.negotiations);
  const switchRole = useSwitchRole();

  const inApproval = redlines
    .map((r) => ({ r, n: negotiations[r.id] }))
    .filter(({ n }) => n && atLeast(n.status, 'awaiting_approval'));
  const ownerQueue = inApproval.filter(({ n }) => n.status === 'awaiting_approval' || n.ownerApproved);
  const financeQueue = inApproval.filter(({ r, n }) => n.status === 'awaiting_approval' || needsFinanceStep(r.id, n.selectedPackages) || n.financeDecision);
  const waitingFinance = inApproval.filter(({ r, n }) => n.status === 'awaiting_approval' && n.ownerApproved && financePackages(r.id, n.selectedPackages).length && !n.financeDecision);
  const readyForLead = inApproval.filter(({ n }) => n.status === 'approved');

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
            {role !== 'owner' && <h2 className="mb-3 text-sm text-muted">Business owners</h2>}
            {ownerQueue.length === 0 ? (
              <EmptyState title="Nothing waiting for you">No negotiation has offers waiting for business owner approval.</EmptyState>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {ownerQueue.map(({ r, n }) => <OwnerCard key={r.id} r={r} n={n} />)}
              </div>
            )}
            {role === 'owner' && waitingFinance.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
                {waitingFinance.map(({ r }) => r.supplier).join(', ')} also need{waitingFinance.length === 1 ? 's' : ''} finance.
                <Button size="sm" variant="outline" onClick={() => switchRole('finance', '/approvals')}>View as finance</Button>
              </div>
            )}
          </section>
        )}
        {showFinance && (
          <section>
            {role !== 'finance' && <h2 className="mb-3 text-sm text-muted">Finance</h2>}
            <FinanceTable items={financeQueue} />
          </section>
        )}
        {readyForLead.length > 0 && role !== 'lead' && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-teal-900/30 bg-teal-900/[0.06] px-5 py-3 text-sm text-teal-title">
            All approvals are in for {readyForLead.map(({ r }) => r.supplier).join(', ')}. The lead can now send the offers.
            <Button size="sm" onClick={() => switchRole('lead', `/redlines/${readyForLead[0].r.id}?tab=packages`)}>Back to the lead’s board</Button>
          </div>
        )}
        {role === 'lead' && (
          <p className="text-sm text-muted">
            You are viewing as the procurement lead. Switch role to approve, or go back to the <Link href="/redlines" className="text-teal-900 underline">negotiations</Link>.
          </p>
        )}
      </div>
    </>
  );
}
