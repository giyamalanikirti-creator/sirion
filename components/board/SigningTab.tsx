'use client';

import { AlertTriangle, Check, FileSignature, ReceiptText, UserRound, X } from 'lucide-react';
import { EmptyState, KpiTile, SirionCard, StatusPill } from '@/components/ui';
import { firstInvoiceCheck } from '@/lib/engines/invoiceCheck';
import { dealFor } from '@/lib/offers';
import { getRedline } from '@/lib/data';
import { COUNTER_PHRASE } from '@/lib/format';
import { hasMoneyLines, legalChanges } from '@/lib/store';
import { useBoard } from './context';
import { formatDate, formatLakh, LINE_LABEL } from '@/lib/format';
import { atLeast, useDemo } from '@/lib/store';
import { callName } from '@/lib/account';

export function SigningTab() {
  const { id, n } = useBoard();
  const { status, supplierPick: pick, counter, signedAt, invoiceChecked } = n;
  const redline = getRedline(id);

  if (!hasMoneyLines(id)) return <LegalOnlySigning />;
  if (!atLeast(status, 'agreed') || !pick) {
    return <EmptyState title="Signing opens once the deal is agreed">{redline.supplier} needs to pick a package, and you need to accept any counter-offer.</EmptyState>;
  }
  const deal = dealFor(id, { ...n, supplierPick: pick });
  const check = firstInvoiceCheck(redline.contractId);
  const signed = status === 'signed';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SirionCard menu={false}>
          <KpiTile small label="Automated checks" value={`${deal.enforceableCount} of ${deal.totalLines}`} caption="commercial terms Sirion can verify" />
        </SirionCard>
        <SirionCard menu={false}>
          <KpiTile small label="Estimated value protected" value={formatLakh(deal.protectedLakh)} caption={`a year vs ${redline.supplier}’s redline (estimate)`} />
        </SirionCard>
        <SirionCard menu={false}>
          <KpiTile small label="Estimated net" value={formatLakh(deal.netLakh)} caption={`a year after our give (${formatLakh(deal.giveCostLakh)})`} />
        </SirionCard>
      </div>

      <SirionCard title={`Agreed wording · package ${deal.packageId}${counter ? ` with ${redline.supplier}’s ${COUNTER_PHRASE[counter.group].replace(/^an? /, '')}` : ''}`} bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-6 py-3 font-normal">Line</th>
                <th className="px-3 py-3 font-normal">Agreed wording</th>
                <th className="px-3 py-3 font-normal">Enforceable</th>
                <th className="px-3 py-3 font-normal">Sirion tracker</th>
                <th className="px-6 py-3 font-normal">First check</th>
              </tr>
            </thead>
            <tbody>
              {deal.lines.map((l) => (
                <tr key={l.line} className="border-t border-line align-top">
                  <td className="px-6 py-3">
                    <div>{LINE_LABEL[l.line]}</div>
                    <div className="text-xs text-muted">residual {formatLakh(l.residualLakh)}/yr</div>
                  </td>
                  <td className="max-w-[320px] px-3 py-3">“{l.wording.text}”</td>
                  <td className="px-3 py-3">
                    {l.enforceable ? (
                      <span className="flex items-center gap-1 text-teal-900"><Check className="h-4 w-4" /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-danger"><X className="h-4 w-4" /> Not enforceable</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={signed ? 'teal' : 'grey'} dot>{l.sirionCheck}</StatusPill>
                  </td>
                  <td className="px-6 py-3 text-muted">{l.firstCheck}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SirionCard>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm text-muted">
          {signed
            ? `Sent for signature${signedAt ? ` on ${formatDate(signedAt)}` : ''}. ${deal.enforceableCount} of ${deal.totalLines} trackers are live; the dashboard north star now counts these terms.`
            : deal.enforceableCount === deal.totalLines
              ? 'Every commercial term has wording Sirion can check. Use Send for signature at the top to switch the trackers on.'
              : `${deal.totalLines - deal.enforceableCount} term${deal.totalLines - deal.enforceableCount === 1 ? '' : 's'} would have no automated check. You can still sign; Sirion will only remind someone to file claims.`}
        </div>
        {signed && <span className="flex items-center gap-1.5 text-sm text-teal-900"><FileSignature className="h-4 w-4" /> Sent for signature</span>}
      </div>

      {signed && check && <InvoiceCheck c={check} checked={invoiceChecked} estimatedLakh={deal.protectedLakh} />}
    </div>
  );
}

function InvoiceCheck({ c, checked, estimatedLakh }: { c: NonNullable<ReturnType<typeof firstInvoiceCheck>>; checked: boolean; estimatedLakh: number }) {
  const rupees = (v: number) => `₹${v.toLocaleString('en-IN')}`;
  // The follow-up owner is the signed-in lead, so profile edits show up here too.
  const profile = useDemo((s) => s.profile);
  return (
    <SirionCard
      title={<span className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> The first invoice after signing</span>}
      action={<StatusPill tone="grey">Simulated</StatusPill>}
    >
      {!checked ? (
        <p className="text-sm text-muted">
          Invoice {c.invoiceId} from {c.supplier} arrived on {formatDate(c.invoiceDate)}. Use <strong className="font-medium text-ink">Run the first invoice check</strong> at the top: Sirion compares it with the signed credit clause and last month’s service levels.
        </p>
      ) : (
        <div className="space-y-5">
          {c.status === 'discrepancy' && (
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-danger/30 bg-danger/[0.04] px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-[15px] leading-snug text-ink">
                  The signed agreement requires an automatic {rupees(c.expectedInr)} credit. The first invoice shows {rupees(c.foundInr)}.{' '}
                  {callName(profile)} has been assigned to follow up.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink">
                <UserRound className="h-4 w-4 text-muted" /> {profile.fullName}, {profile.jobTitle} · due in {c.dueInDays} days
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-line p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted">Signed clause · service credits</div>
              <p className="mt-2 text-[15px] text-ink">“{c.clause.text}”</p>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted">Service in {c.serviceMonth}</dt><dd>Uptime {c.uptimeActual}% vs {c.uptimeTarget}% target</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Credit rule</dt><dd className="text-right">{c.creditRule}</dd></div>
                <div className="flex justify-between gap-3 font-medium"><dt>Credit the clause requires</dt><dd className="text-teal-900">{rupees(c.expectedInr)}</dd></div>
              </dl>
            </div>
            <div className="rounded-md border border-line p-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted">
                <span>Invoice {c.invoiceId}</span>
                <span>{formatDate(c.invoiceDate)}</span>
              </div>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  <tr className="border-b border-line"><td className="py-2">Subscription, {c.serviceMonth}</td><td className="py-2 text-right tabular-nums">{rupees(c.monthlyFeeInr)}</td></tr>
                  <tr className="border-b border-line">
                    <td className="py-2">Service credit</td>
                    <td className="py-2 text-right tabular-nums text-danger">{c.foundInr ? `−${rupees(c.foundInr)}` : `${rupees(0)} (expected −${rupees(c.expectedInr)})`}</td>
                  </tr>
                  <tr className="font-medium"><td className="py-2">Amount due</td><td className="py-2 text-right tabular-nums">{rupees(c.monthlyFeeInr - c.foundInr)}</td></tr>
                </tbody>
              </table>
              {c.gapInr > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-danger/[0.06] px-3 py-2 text-sm">
                  <span className="text-ink">Credit flagged for follow-up</span>
                  <span className="font-medium tabular-nums text-danger">{rupees(c.gapInr)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-t border-line pt-4 text-sm md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Estimated value protected</div>
              <div>{formatLakh(estimatedLakh)} a year. A forecast from contract history; it stays an estimate.</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Actual credits recovered</div>
              <div>{rupees(c.foundInr)} so far. {rupees(c.gapInr)} is flagged for follow-up and counts only once it appears on an invoice.</div>
            </div>
          </div>
        </div>
      )}
    </SirionCard>
  );
}


/** Redlines with legal changes only: sign once legal has decided every change. */
function LegalOnlySigning() {
  const { id, n } = useBoard();
  const redline = getRedline(id);
  const items = legalChanges(id);
  const pending = items.filter((c) => !n.legalDecisions[c.no]);
  const signed = n.status === 'signed';
  if (!n.sortResult) return <EmptyState title="Analyse the changes first">Signing opens once the changes are analysed.</EmptyState>;
  return (
    <div className="space-y-4">
      <SirionCard title={`Legal decisions · ${redline.supplier}`} bodyClassName="p-0">
        <table className="w-full text-sm">
          <tbody>
            {items.map((c) => (
              <tr key={c.no} className="h-12 border-t border-line first:border-t-0">
                <td className="px-6">Clause {c.clause} · {c.title}</td>
                <td className="px-6 text-right">
                  {n.legalDecisions[c.no] ? (
                    <StatusPill tone={n.legalDecisions[c.no] === 'rejected' ? 'danger' : 'teal'}>{n.legalDecisions[c.no]}</StatusPill>
                  ) : (
                    <StatusPill tone="indigo">Waiting on legal</StatusPill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SirionCard>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm text-muted">
          {signed
            ? `Sent for signature${n.signedAt ? ` on ${formatDate(n.signedAt)}` : ''}. No money lines changed, so the north star is unaffected.`
            : pending.length
              ? `Waiting for Legal on ${pending.length} change${pending.length === 1 ? '' : 's'}.`
              : 'Legal has decided every change. Use Send for signature at the top.'}
        </div>
      </div>
    </div>
  );
}
