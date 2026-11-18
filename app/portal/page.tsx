'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { redlines } from '@/lib/data';
import { changedLines } from '@/lib/engines/redline';
import { atLeast, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

/** Concept: in production each supplier only sees its own portal. The demo lets the presenter pick which supplier to play. */
export default function PortalIndex() {
  const negotiations = useDemo((s) => s.negotiations);
  const rows = redlines
    .filter((r) => changedLines(r).length > 0)
    .map((r) => {
      const status = negotiations[r.id]?.status ?? 'received';
      const label =
        status === 'with_supplier' ? 'Proposal waiting for you' : atLeast(status, 'countered') ? 'Response sent' : 'Nothing to respond to yet';
      return { r, label, ready: status === 'with_supplier' };
    });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-4 sm:-mx-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-medium text-ink">Supplier portal</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">Concept</span>
        </div>
        <RoleSwitcher compact />
      </header>
      <h1 className="mt-8 text-[22px] font-normal text-ink">Which supplier are you?</h1>
      <p className="mt-1 text-sm text-[#5f6b6d]">In the real product each supplier signs in to its own portal. For the demo, pick one.</p>
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
        {rows.map(({ r, label, ready }) => (
          <li key={r.id}>
            <Link href={`/portal/${r.slug}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-page-bg">
              <span className="font-medium text-ink">{r.supplier}</span>
              <span className={cn('flex items-center gap-2 text-sm', ready ? 'text-teal-900' : 'text-muted')}>
                {label} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">DataVault is not listed: its redline has legal changes only, so there is no offer to choose.</p>
    </div>
  );
}
