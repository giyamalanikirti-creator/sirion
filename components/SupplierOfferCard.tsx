'use client';

import { wordingLibrary } from '@/lib/data';
import { GIVE_SUPPLIER_LABEL } from '@/lib/engines/gives';
import type { Line, PricedPackage } from '@/lib/types';
import { cn } from '@/lib/utils';

const LINE_PLAIN: Record<Line, string> = { renewal: 'Renewal', credits: 'Service credits', price: 'Price changes' };

/** Supplier-facing plain wording per line. No ₹, no costs, no peer data. */
export const wordingFor = (line: Line, group: string) => wordingLibrary.find((w) => w.line === line && w.wordingGroup === group)!;

/** What the supplier sees as the offer's title (no internal names that hint at value). */
export function supplierTitle(p: PricedPackage) {
  if (p.id === 'D') return 'Keep the current terms';
  if (p.id === 'E') return 'A middle ground on credits';
  return p.name;
}

/** What the supplier gets, in its own terms. */
export function supplierGets(p: PricedPackage): string[] {
  if (p.gives.length) return p.gives.map((g) => GIVE_SUPPLIER_LABEL[g.id]);
  if (p.id === 'E') return ['Credits are claimed by us, rather than applied to the invoice automatically'];
  return ['A quick renewal on the terms below'];
}

/**
 * One offer as the supplier sees it. Used by the supplier portal and by the
 * lead's "Preview what the supplier will see", so the preview can't drift.
 */
export function SupplierOfferCard({
  p, reasons, loading, chosen, onPick, disabled, as = 'button',
}: {
  p: PricedPackage;
  reasons: Record<string, string>;
  loading?: boolean;
  chosen?: boolean;
  onPick?: () => void;
  disabled?: boolean;
  as?: 'button' | 'div';
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Offer {p.id}</span>
        {as === 'button' && <span className={cn('h-4 w-4 rounded-full border', chosen ? 'border-[5px] border-teal-900' : 'border-[#c9d2d3]')} />}
      </div>
      <h2 className="mt-1 text-[18px] text-ink">{supplierTitle(p)}</h2>
      <div className="mt-4 text-[11px] uppercase tracking-wide text-muted">You get</div>
      <ul className="mt-1 space-y-1 text-sm">
        {supplierGets(p).map((t) => <li key={t}>{t}</li>)}
      </ul>
      <div className="mt-4 text-[11px] uppercase tracking-wide text-muted">We agree that</div>
      <ul className="mt-1 space-y-3 text-sm">
        {p.lines.map((l) => {
          const w = wordingFor(l, p.wordings[l]);
          return (
            <li key={l}>
              <div className="font-medium">{LINE_PLAIN[l]}</div>
              <div className="text-[#3c4a4d]">“{w.text}”</div>
              <div className="mt-0.5 text-xs text-teal-900">
                {loading ? <span className="inline-block h-3 w-40 animate-pulse rounded bg-page-bg" /> : `Why: ${reasons[w.id] ?? w.plainReason}`}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
  const cls = cn(
    'flex flex-col rounded-lg border bg-white p-6 text-left shadow-sm transition',
    chosen ? 'border-teal-900 ring-2 ring-teal-900/20' : 'border-line',
    as === 'button' && !chosen && 'hover:border-teal-900/40',
  );
  if (as === 'div') return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onPick} aria-pressed={chosen} disabled={disabled} className={cls}>
      {body}
    </button>
  );
}
