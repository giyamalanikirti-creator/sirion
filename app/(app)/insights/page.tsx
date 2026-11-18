'use client';

import { useEffect } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { GroupedBars, TrendChart } from '@/components/charts';
import { PageHeader, SirionCard, StatusPill } from '@/components/ui';
import { kpiHistory, learning, pooledRates } from '@/lib/data';
import { GROUP_LABEL, LINE_LABEL, formatLakh } from '@/lib/format';
import { MIN_POOLED_COMPANIES } from '@/lib/settings';
import { useDemo } from '@/lib/store';

const MISS = 0.25;

export default function InsightsPage() {
  const completeStep = useDemo((s) => s.completeStep);
  useEffect(() => completeStep(9), [completeStep]);

  const rows = learning.map((r) => {
    const err = (r.actual - r.predicted) / r.predicted;
    return { ...r, label: r.supplier.split(' ')[0], err, miss: Math.abs(err) > MISS };
  });
  const misses = rows.filter((r) => r.miss);
  const trend = kpiHistory.roundsToSign.map((q, i) => {
    const ns = kpiHistory.northStar.byQuarter[i];
    return { quarter: q.quarter, rounds: q.rounds, enforceable: Math.round((ns.enforceable / ns.total) * 100) };
  });

  return (
    <>
      <PageHeader title="Insights" subtitle="Did last year’s price tags come true? And where do the pooled numbers come from?" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SirionCard title="Predicted vs actual (last year, ₹ lakh a year)" className="lg:col-span-2">
          <GroupedBars
            data={rows}
            x="label"
            series={[
              { key: 'predicted', label: 'Predicted', color: '#828BFC' },
              { key: 'actual', label: 'Actual', color: '#0C5E69' },
            ]}
            format={(v) => formatLakh(v)}
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-2 font-normal">Line</th>
                  <th className="py-2 font-normal">Supplier</th>
                  <th className="py-2 text-right font-normal">Predicted</th>
                  <th className="py-2 text-right font-normal">Actual</th>
                  <th className="py-2 text-right font-normal">Gap</th>
                  <th className="py-2 pl-6 font-normal">Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.supplier + r.line} className="h-11 border-t border-line">
                    <td>{r.line}</td>
                    <td>{r.supplier}</td>
                    <td className="text-right tabular-nums">{formatLakh(r.predicted)}</td>
                    <td className="text-right tabular-nums">{formatLakh(r.actual)}</td>
                    <td className={'text-right tabular-nums ' + (r.miss ? 'text-danger' : 'text-muted')}>
                      {r.err > 0 ? '+' : '−'}{Math.abs(Math.round(r.err * 100))}%
                    </td>
                    <td className="pl-6">
                      {r.miss ? (
                        <span className="flex items-center gap-1.5 text-danger"><AlertTriangle className="h-4 w-4" /> Prediction missed: review this group</span>
                      ) : (
                        <StatusPill tone="mint">Within 25%</StatusPill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            {rows.length - misses.length} of {rows.length} predictions landed within 25%. A miss flags the wording group for review before its next price tag is trusted.
          </p>
        </SirionCard>

        <SirionCard title="Pooled numbers" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-6 py-3 font-normal">Supplier type · line</th>
                  <th className="px-3 py-3 font-normal">Wording</th>
                  <th className="px-3 py-3 text-right font-normal">Companies</th>
                  <th className="px-6 py-3 font-normal">Figure</th>
                </tr>
              </thead>
              <tbody>
                {pooledRates.map((p) => {
                  const ok = p.companies >= MIN_POOLED_COMPANIES;
                  return (
                    <tr key={p.supplierType + p.line + p.wordingGroup} className="h-12 border-t border-line">
                      <td className="px-6 capitalize">{p.supplierType} · {LINE_LABEL[p.line].toLowerCase()}</td>
                      <td className="px-3 text-muted">{GROUP_LABEL[p.wordingGroup]}</td>
                      <td className="px-3 text-right tabular-nums">{p.companies}</td>
                      <td className="px-6">
                        {ok ? p.label : <span className="flex items-center gap-1.5 text-muted"><Lock className="h-3.5 w-3.5" /> Not enough companies yet</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-6 py-4 text-xs leading-relaxed text-muted">
            <strong className="font-medium text-ink">Privacy:</strong> counts only, never contract text or names. A figure shows only with 20+ companies, a
            little noise is added, data is at least 6 months old, and companies opt in. Suppliers never see pooled numbers.
          </div>
        </SirionCard>

        <SirionCard title="Rounds to sign vs money lines enforceable">
          <TrendChart
            data={trend}
            x="quarter"
            bar={{ key: 'rounds', label: 'Rounds to sign (avg)' }}
            line={{ key: 'enforceable', label: 'Enforceable at signing (%)' }}
          />
          <p className="mt-2 text-xs text-muted">Fewer back-and-forth rounds as more money lines get checkable wording.</p>
        </SirionCard>
      </div>
    </>
  );
}
