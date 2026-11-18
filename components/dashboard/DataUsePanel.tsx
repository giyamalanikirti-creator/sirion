'use client';

import { Database, Lock, Share2, Users } from 'lucide-react';
import { contracts, invoices, renewals, serviceEvents } from '@/lib/data';
import { recovery } from '@/lib/engines/costEngine';
import { formatPct } from '@/lib/format';
import { useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-teal-900' : 'bg-[#c9d2d3]')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

/** What the workspace may read, and the admin's two independent peer-data controls. */
export function DataUsePanel({ className }: { className?: string }) {
  const data = useDemo((s) => s.data);
  const setData = useDemo((s) => s.setData);
  const example = recovery('claim_le_10');

  const sources = [
    { n: contracts.length, label: 'contracts' },
    { n: invoices.length, label: 'invoice lines' },
    { n: serviceEvents.length, label: 'service-level records' },
    { n: renewals.length, label: 'past renewals' },
  ];

  return (
    <section className={cn('rounded-lg border border-line bg-white p-5 shadow-card', className)} aria-labelledby="data-use-title">
      <h2 id="data-use-title" className="flex items-center gap-2 text-[15px] text-teal-title">
        <Database className="h-4 w-4" /> How this workspace uses data
      </h2>
      <p className="mt-2 text-xs text-muted">Your admin authorised read-only analysis of:</p>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {sources.map((s) => (
          <li key={s.label}><span className="tabular-nums text-ink">{s.n.toLocaleString('en-IN')}</span> <span className="text-muted">{s.label}</span></li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted">Used only to estimate costs. Nothing in Sirion is changed.</p>

      <div className="mt-3 divide-y divide-line border-t border-line">
        <Toggle
          on={data.usePeerBenchmarks}
          onChange={(v) => setData({ usePeerBenchmarks: v })}
          label="Use aggregate peer benchmarks"
          hint="When our own history is thin, estimates may use outcomes from 20+ participating companies."
        />
        <Toggle
          on={data.contributeOutcomes}
          onChange={(v) => setData({ contributeOutcomes: v })}
          label="Contribute aggregate outcomes to peer benchmarks"
          hint={data.contributeOutcomes ? 'On: rates like the one below are shared, at least 6 months old, with a little noise.' : 'Off by default. Using benchmarks does not require contributing.'}
        />
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-page-bg p-2.5">
          <div className="mb-1 flex items-center gap-1 font-medium text-ink"><Share2 className="h-3 w-3" /> {data.contributeOutcomes ? 'Shared' : 'Would be shared'}</div>
          A rate and a count, e.g. “claim within 10 days: {formatPct(example.recovery)} of credits recovered, {example.n} contracts”.
        </div>
        <div className="rounded-lg bg-page-bg p-2.5">
          <div className="mb-1 flex items-center gap-1 font-medium text-ink"><Lock className="h-3 w-3" /> Always private</div>
          Contract text, supplier names, prices and people.
        </div>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted">
        <Users className="mt-0.5 h-3 w-3 shrink-0" /> In the product only a workspace admin can change these settings. In this demo, anyone can.
      </p>
    </section>
  );
}
