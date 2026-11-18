'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Donut, SimpleBars, StackedBars } from '@/components/charts';
import { Button, KpiTile, PageHeader, SirionCard } from '@/components/ui';
import { atStakeByRedline, creditsByGroup, creditWordingSplit, northStar, noticeDeadlinesNext6Months } from '@/lib/engines/dashboard';
import { formatLakh } from '@/lib/format';
import { useDemo } from '@/lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const status = useDemo((s) => s.status);
  const signed = status === 'signed';

  const stake = atStakeByRedline(!signed);
  const totalStake = stake.reduce((a, r) => a + r.atStake, 0);
  const ns = northStar(signed);
  const credits = creditsByGroup();
  const deadlines = noticeDeadlinesNext6Months();
  const split = creditWordingSplit();

  return (
    <>
      <PageHeader
        title="Dashboard"
        action={<Button variant="outline" disabled title="Not part of this prototype">Create dashboard</Button>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SirionCard title="Money at stake in open redlines">
          <KpiTile
            label="At stake"
            value={<>{formatLakh(totalStake).replace(' lakh', '')}<span className="ml-2 text-2xl text-muted">lakh / yr</span></>}
            caption={`${stake.length} open redlines · CloudDesk ${signed ? 'signed' : formatLakh(stake[0].atStake)}`}
          />
        </SirionCard>

        <SirionCard title="Money lines enforceable at signing">
          <KpiTile
            label="North star"
            value={`${Math.round(ns.pct * 100)}%`}
            caption={
              <>
                {ns.enforceable} of {ns.total} money lines have a Sirion check{signed ? <span className="text-teal-900"> · up from 62% after CloudDesk</span> : ''}
              </>
            }
          />
        </SirionCard>

        <SirionCard title="At stake by open redline (₹ lakh / yr)">
          <SimpleBars
            data={stake.map((r) => ({ ...r, atStake: +r.atStake.toFixed(2) }))}
            x="short"
            y="atStake"
            format={(v) => formatLakh(v)}
            onBarClick={(d) => router.push(d.id === 'RL-CLOUDDESK' ? '/redlines/RL-CLOUDDESK' : '/redlines')}
          />
          <p className="mt-2 text-xs text-muted">Click a bar to open the redline. Only CloudDesk is interactive in this demo.</p>
        </SirionCard>

        <SirionCard title="Credits owed vs recovered (12 months, ₹ lakh)">
          <StackedBars
            data={credits}
            x="group"
            series={[
              { key: 'recovered', label: 'Recovered', color: '#0C5E69' },
              { key: 'lost', label: 'Lost', color: '#B1D0CA' },
            ]}
            format={(v) => formatLakh(v)}
          />
          <p className="mt-2 text-xs text-muted">
            Software contracts. Automatic: {credits[0].contracts} contracts · claim within ≤10 days: {credits[1].contracts} contracts.
          </p>
        </SirionCard>

        <SirionCard title="Notice deadlines: next 6 months">
          <SimpleBars data={deadlines} x="month" y="count" yLabel="Contracts" />
          <p className="mt-2 text-xs text-muted">Auto-renew contracts only: end date minus notice days.</p>
        </SirionCard>

        <SirionCard title="Money lines by wording: service credits">
          <Donut data={split} />
          <p className="mt-2 text-xs text-muted">
            25 software contracts. Claim-based credits recover far less: see{' '}
            <Link className="text-teal-900 underline" href="/insights">Insights</Link>.
          </p>
        </SirionCard>
      </div>
    </>
  );
}
