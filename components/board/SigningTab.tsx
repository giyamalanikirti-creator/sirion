'use client';

import { AlertTriangle, Check, FileSignature, ReceiptText, UserRound, X } from 'lucide-react';
import { Button, EmptyState, KpiTile, SirionCard, StatusPill } from '@/components/ui';
import { firstInvoiceCheck } from '@/lib/engines/invoiceCheck';
import { finalDeal } from '@/lib/engines/negotiation';
import { getRedline } from '@/lib/data';
import { COUNTER_PHRASE } from '@/lib/format';
import { hasMoneyLines, legalChanges } from '@/lib/store';
import { useBoard } from './context';
import { formatDate, formatLakh, LINE_LABEL } from '@/lib/format';
import { atLeast } from '@/lib/store';

export function SigningTab() {
  const { id, n, sign, runInvoiceCheck } = useBoard();
  const { status, supplierPick: pick, counter, signedAt, invoiceChecked } = n;
  const redline = getRedline(id);

  if (!hasMoneyLines(id)) return <LegalOnlySigning />;
  if (!atLeast(status, 'agreed') || !pick) {
    return <EmptyState title="Signing opens once the deal is agreed">{redline.supplier} needs to pick a package, and you need to accept any counter-offer.</EmptyState>;
  }
  const deal = finalDeal(pick, counter ? [counter] : [], id);
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm text-muted">
          {signed
            ? `Sent for signature${signedAt ? ` on ${formatDate(signedAt)}` : ''}. All three trackers are live; the dashboard north star now counts these lines.`
            : 'Every money line has wording a system can check. Send it for signature to switch the trackers on.'}
        </div>
        <Button onClick={sign} disabled={signed}>
          <FileSignature className="h-4 w-4" /> {signed ? 'Sent for signature' : 'Send for signature'}
        </Button>
      </div>

      {signed && check && <InvoiceCheck c={check} checked={invoiceChecked} onRun={runInvoiceCheck} estimatedLakh={deal.protectedLakh} />}
    </div>
  );
}

function InvoiceCheck({ c, checked, onRun, estimatedLakh }: { c: NonNullable<ReturnType<typeof firstInvoiceCheck>>; checked: boolean; onRun: () => void; estimatedLakh: number }) {
  const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  return (
    <SirionCard
      title={<span className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Monday morning: the first invoice check</span>}
      action={<StatusPill tone="grey">Simulated</StatusPill>}
    >
      {!checked ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm text-muted">
            Invoice {c.invoiceId} from {c.supplier} arrived on {formatDate(c.invoiceDate)}. Sirion compares it with the signed credit clause and last
            month’s service levels.
          </p>
          <Button onClick={onRun}>Run the check</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Fact n={1} label="Signed clause" value={`“${c.clause.text}”`} />
            <Fact n={2} label={`Service failure · ${c.serviceMonth}`} value={`Uptime ${c.uptimeActual}% vs ${c.uptimeTarget}% target (${c.shortfall}% short)`} />
            <Fact n={3} label="Credit expected" value={rupees(c.expectedInr)} sub={c.creditRule} strong />
            <Fact n={4} label={`Credit found on ${c.invoiceId}`} value={rupees(c.foundInr)} danger={c.foundInr < c.expectedInr} />
          </ol>
          {c.status === 'discrepancy' && (
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-danger/30 bg-danger/[0.04] px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <div>
                  <div className="font-medium text-ink">{rupees(c.gapInr)} credit missing from the invoice</div>
                  <div className="text-muted">{c.action} · due in {c.dueInDays} days</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-ink">
                <UserRound className="h-4 w-4 text-muted" /> Owner: {c.owner}
              </div>
            </div>
          )}
          <div className="grid gap-3 border-t border-line pt-4 text-sm md:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Estimated value protected</div>
              <div>{formatLakh(estimatedLakh)} a year. Forecast from contract history; it stays an estimate.</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">Actual credits recovered</div>
              <div>
                {rupees(c.foundInr)} of {rupees(c.expectedInr)} expected so far. Counted only when a credit appears on an invoice.
              </div>
            </div>
          </div>
        </div>
      )}
    </SirionCard>
  );
}

function Fact({ n, label, value, sub, strong, danger }: { n: number; label: string; value: string; sub?: string; strong?: boolean; danger?: boolean }) {
  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-page-bg text-[10px]">{n}</span>
        {label}
      </div>
      <div className={'mt-1.5 text-sm ' + (danger ? 'text-[20px] font-light text-danger' : strong ? 'text-[20px] font-light text-teal-900' : 'text-ink')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </li>
  );
}

/** Redlines with legal changes only: sign once legal has decided every change. */
function LegalOnlySigning() {
  const { id, n, sign } = useBoard();
  const redline = getRedline(id);
  const items = legalChanges(id);
  const pending = items.filter((c) => !n.legalDecisions[c.no]);
  const signed = n.status === 'signed';
  if (!n.sortResult) return <EmptyState title="Sort the changes first">Signing opens once the changes are sorted.</EmptyState>;
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-sm text-muted">
          {signed
            ? `Sent for signature${n.signedAt ? ` on ${formatDate(n.signedAt)}` : ''}. No money lines changed, so the north star is unaffected.`
            : pending.length
              ? `Waiting for legal on ${pending.length} change${pending.length === 1 ? '' : 's'}. Switch to the Legal role to decide.`
              : 'Legal has decided every change. No money lines changed, so nothing needs pricing.'}
        </div>
        <Button onClick={sign} disabled={signed || pending.length > 0}>
          <FileSignature className="h-4 w-4" /> {signed ? 'Sent for signature' : 'Send for signature'}
        </Button>
      </div>
    </div>
  );
}
