'use client';

import { Check, FileSignature, X } from 'lucide-react';
import { Button, EmptyState, KpiTile, SirionCard, StatusPill } from '@/components/ui';
import { finalDeal } from '@/lib/engines/negotiation';
import { formatDate, formatLakh, LINE_LABEL } from '@/lib/format';
import { atLeast, useDemo } from '@/lib/store';

export function SigningTab() {
  const status = useDemo((s) => s.status);
  const pick = useDemo((s) => s.supplierPick);
  const counter = useDemo((s) => s.counter);
  const sign = useDemo((s) => s.sign);
  const signedAt = useDemo((s) => s.signedAt);

  if (!atLeast(status, 'agreed') || !pick) {
    return <EmptyState title="Signing opens once the deal is agreed">CloudDesk needs to pick a package, and you need to accept any counter-offer.</EmptyState>;
  }
  const deal = finalDeal(pick, counter ? [counter] : []);
  const signed = status === 'signed';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SirionCard menu={false}>
          <KpiTile small label="Enforceable" value={`${deal.enforceableCount} of ${deal.totalLines}`} caption="money lines with a Sirion check" />
        </SirionCard>
        <SirionCard menu={false}>
          <KpiTile small label="Protected" value={formatLakh(deal.protectedLakh)} caption="a year vs CloudDesk’s redline" />
        </SirionCard>
        <SirionCard menu={false}>
          <KpiTile small label="Net" value={formatLakh(deal.netLakh)} caption={`a year after our give (${formatLakh(deal.giveCostLakh)})`} />
        </SirionCard>
      </div>

      <SirionCard title={`Agreed wording · package ${deal.packageId}${counter ? ' with CloudDesk’s 7% cap' : ''}`} bodyClassName="p-0">
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
            ? `Sent for signature ${signedAt ? formatDate(signedAt) : ''}. All three trackers are live; the dashboard north star now counts these lines.`
            : 'Every money line has wording a system can check. Send it for signature to switch the trackers on.'}
        </div>
        <Button onClick={sign} disabled={signed}>
          <FileSignature className="h-4 w-4" /> {signed ? 'Sent for signature' : 'Send for signature'}
        </Button>
      </div>
    </div>
  );
}
