'use client';

import { useRouter } from 'next/navigation';
import { CHART, HBars, StackedHBars } from '@/components/charts';
import { ActiveTask, OtherNegotiations } from '@/components/dashboard/FrontDoor';
import { KpiTile, Panel } from '@/components/ui';
import { callName } from '@/lib/account';
import { redlines } from '@/lib/data';
import { atStakeByRedline, creditsByGroup, northStar } from '@/lib/engines/dashboard';
import { formatLakh } from '@/lib/format';
import { nextStep } from '@/lib/nextStep';
import { dealFor } from '@/lib/offers';
import { STORY_REDLINE, useDemo } from '@/lib/store';

export default function OverviewPage() {
  const router = useRouter();
  const negotiations = useDemo((s) => s.negotiations);
  const profile = useDemo((s) => s.profile);

  // A negotiation only gets a ₹ figure once its changes are analysed; signed ones leave the open list.
  const openPriced = redlines.filter((r) => negotiations[r.id]?.sortResult && negotiations[r.id].status !== 'signed').map((r) => r.id);
  const unanalysed = redlines.filter((r) => !negotiations[r.id]?.sortResult).map((r) => r.supplier);
  const stake = atStakeByRedline(openPriced).filter((r) => r.atStake > 0.005).sort((a, b) => b.atStake - a.atStake);
  const totalStake = stake.reduce((a, r) => a + r.atStake, 0);
  const signedDeals = redlines
    .filter((r) => negotiations[r.id]?.status === 'signed' && negotiations[r.id].supplierPick)
    .map((r) => {
      const d = dealFor(r.id, { ...negotiations[r.id], supplierPick: negotiations[r.id].supplierPick! });
      return { enforceable: d.enforceableCount, total: d.totalLines };
    });
  const ns = northStar(signedDeals);
  const waitingOnYou = redlines.filter((r) => nextStep(r.id, negotiations[r.id]).turn === 'you').length;
  const credits = creditsByGroup();
  const rec = credits.reduce((a, c) => a + c.recovered, 0);
  const owed = credits.reduce((a, c) => a + c.recovered + c.lost, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-muted">Hello, {callName(profile)}</div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">Overview</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <ActiveTask />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <OtherNegotiations />
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-[18px] font-semibold text-ink">Portfolio</h2>
      <section aria-label="Key figures" className="grid grid-cols-2 divide-line rounded-lg border border-line bg-white lg:grid-cols-4 lg:divide-x">
        <KpiTile
          className="border-b border-line p-5 lg:border-b-0"
          label="Estimated exposure, open negotiations"
          value={<>{formatLakh(totalStake)}<span className="ml-1 text-[14px] font-normal text-muted">/ yr</span></>}
          caption={`${stake.length} analysed · vs procurement benchmarks`}
        />
        <KpiTile
          className="border-b border-l border-line p-5 lg:border-b-0 lg:border-l-0"
          label="Signed terms with an automated check"
          value={`${Math.round(ns.pct * 100)}%`}
          tone="teal"
          caption={`${ns.enforceable} of ${ns.total} renewal, credit and price terms`}
        />
        <KpiTile className="p-5" label="Negotiations waiting on you" value={waitingOnYou} caption={`${redlines.length} open or recently signed`} />
        <KpiTile
          className="border-l border-line p-5 lg:border-l-0"
          label="Service credits recovered, 12 months"
          value={`${Math.round((rec / owed) * 100)}%`}
          tone="positive"
          caption={`${formatLakh(rec)} of ${formatLakh(owed)} owed · software contracts`}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel
          className="min-w-0 lg:col-span-8"
          title="Estimated exposure by supplier (₹ lakh a year)"
          subtitle="Against procurement benchmarks. Select a bar to open the negotiation."
        >
          {stake.length ? (
            <HBars
              data={stake.map((r) => ({ ...r, atStake: +r.atStake.toFixed(2) }))}
              y="supplier"
              x="atStake"
              format={(v) => formatLakh(v)}
              highlight={stake.some((r) => r.id === STORY_REDLINE) ? (d) => d.id === STORY_REDLINE : undefined}
              onBarClick={(d) => router.push(`/redlines/${d.id}`)}
            />
          ) : (
            <p className="text-[14px] text-muted">No analysed negotiations are open.</p>
          )}
          {unanalysed.length > 0 && <p className="mt-2 text-[12px] text-muted">Not yet analysed: {unanalysed.join(', ')}.</p>}
        </Panel>
        <Panel className="min-w-0 lg:col-span-4" title="Service credits recovered (₹ lakh, 12 months)" subtitle="Software contracts, by credit wording.">
          <StackedHBars
            data={credits.map((c) => ({ ...c, group: c.group.replace('Claim within ≤10 days', '10-day claim').replace('Automatic credits', 'Automatic') }))}
            y="group"
            labelWidth={92}
            series={[
              { key: 'recovered', label: 'Recovered', color: CHART.positive },
              { key: 'lost', label: 'Missed', color: CHART.missed },
            ]}
            format={(v) => formatLakh(v)}
          />
          <p className="mt-1 text-[12px] text-muted">
            Automatic: {credits[0].contracts} contracts · 10-day claim: {credits[1].contracts} contracts.
          </p>
        </Panel>
      </div>
    </>
  );
}
