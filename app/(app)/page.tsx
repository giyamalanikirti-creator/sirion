'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileDiff } from 'lucide-react';
import { Donut, SimpleBars, StackedBars } from '@/components/charts';
import { KpiTile, PageHeader, SirionCard } from '@/components/ui';
import { getRedline } from '@/lib/data';
import { atStakeByRedline, creditsByGroup, creditWordingSplit, northStar, noticeDeadlinesNext6Months } from '@/lib/engines/dashboard';
import { redlinePriceTags } from '@/lib/engines/redline';
import { formatDate, formatLakh } from '@/lib/format';
import { atLeast, STORY_REDLINE, useDemo, useNegotiation } from '@/lib/store';
import { finalDeal } from '@/lib/engines/negotiation';
import { redlines } from '@/lib/data';

const BOARD = '/redlines/RL-CLOUDDESK';

function FrontDoor() {
  const status = useNegotiation(STORY_REDLINE).status;
  const sorted = atLeast(status, 'sorted');
  const signed = status === 'signed';
  const r = getRedline('RL-CLOUDDESK');
  const { contract: c, totalLakh } = redlinePriceTags(r.id);

  let title: string, body: string, cta: string, href: string;
  if (signed) {
    title = 'CloudDesk is signed. All three commercial terms have an automated check.';
    body = 'The first invoice after signature is where the service-credit clause earns its keep.';
    cta = 'See the first invoice check';
    href = `${BOARD}?tab=signing`;
  } else if (sorted) {
    title = `CloudDesk’s three money edits carry an estimated ${formatLakh(totalLakh)} a year of exposure`;
    body = 'Measured against procurement benchmarks. Two routine edits are logged and one liability change is with legal.';
    cta = 'Continue the negotiation';
    href = `${BOARD}?tab=${atLeast(status, 'awaiting_approval') ? 'packages' : 'tags'}`;
  } else {
    title = `CloudDesk returned your ${formatLakh(c.annualFeeInr / 1e5)} renewal with ${r.changes.length} edits`;
    body = `Helpdesk software · ${c.seats} seats · received ${formatDate(r.receivedAt)}. Some edits are routine; some change what you pay. Sort them before anyone says yes.`;
    cta = 'Review supplier changes';
    href = `${BOARD}?tab=changes`;
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-teal-900 text-white shadow-card">
      <div className="flex flex-col gap-5 px-6 py-7 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex">
            <FileDiff className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/60">Waiting on you</div>
            <h2 className="mt-1 max-w-2xl text-[22px] font-normal leading-snug">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">{body}</p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-teal-900 hover:bg-white/90"
        >
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const negotiations = useDemo((s) => s.negotiations);
  const cd = negotiations[STORY_REDLINE];
  const signed = cd?.status === 'signed';
  const priced = !!cd && atLeast(cd.status, 'sorted');

  // A redline only gets a ₹ figure once its changes are sorted; signed redlines leave the open list.
  const openPriced = redlines.filter((r) => negotiations[r.id]?.sortResult && negotiations[r.id].status !== 'signed').map((r) => r.id);
  const unsortedCount = redlines.filter((r) => !negotiations[r.id]?.sortResult).length;
  const stake = atStakeByRedline(openPriced);
  const totalStake = stake.reduce((a, r) => a + r.atStake, 0);
  const signedDeals = redlines
    .filter((r) => negotiations[r.id]?.status === 'signed' && negotiations[r.id].supplierPick)
    .map((r) => {
      const n = negotiations[r.id];
      const d = finalDeal(n.supplierPick!, n.counter ? [n.counter] : [], r.id);
      return { enforceable: d.enforceableCount, total: d.totalLines };
    });
  const ns = northStar(signedDeals);
  const credits = creditsByGroup();
  const deadlines = noticeDeadlinesNext6Months();
  const split = creditWordingSplit();
  const cdStake = stake.find((r) => r.id === STORY_REDLINE);
  const cloudDeskCaption = signed ? 'CloudDesk signed' : priced && cdStake ? `CloudDesk ${formatLakh(cdStake.atStake)}` : `${unsortedCount} not sorted yet`;

  return (
    <>
      <PageHeader title="Dashboard" />
      <FrontDoor />
      <h2 className="mb-3 text-sm text-muted">Portfolio</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <SirionCard title="Estimated exposure in open redlines">
          <KpiTile
            label="vs procurement benchmarks"
            value={<>{formatLakh(totalStake).replace(' lakh', '')}<span className="ml-2 text-2xl text-muted">lakh / yr</span></>}
            caption={`${stake.length} priced redline${stake.length === 1 ? '' : 's'} · ${cloudDeskCaption}`}
          />
        </SirionCard>

        <SirionCard title="Signed commercial terms with an automated check">
          <KpiTile
            label="North star"
            value={`${Math.round(ns.pct * 100)}%`}
            caption={
              <>
                {ns.enforceable} of {ns.total} signed renewal, credit and price terms have a Sirion check
                {signedDeals.length ? <span className="text-teal-900"> · up from 62% with {signedDeals.length} signed here</span> : ''}
              </>
            }
          />
        </SirionCard>

        <SirionCard title="Estimated exposure by open redline (₹ lakh / yr)">
          <SimpleBars
            data={stake.map((r) => ({ ...r, atStake: +r.atStake.toFixed(2) }))}
            x="short"
            y="atStake"
            format={(v) => formatLakh(v)}
            onBarClick={(d) => router.push(`/redlines/${d.id}`)}
          />
          <p className="mt-2 text-xs text-muted">
            Versus procurement benchmarks, not current terms. {priced ? '' : 'CloudDesk appears once its changes are sorted. '}Click a bar to open the redline.
          </p>
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
            Actual credits, software contracts. Automatic: {credits[0].contracts} contracts · claim within ≤10 days: {credits[1].contracts} contracts.
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
