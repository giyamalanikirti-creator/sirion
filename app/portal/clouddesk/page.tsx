'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { Button } from '@/components/ui';
import { packageTemplates, wordingLibrary } from '@/lib/data';
import { GIVE_SUPPLIER_LABEL } from '@/lib/engines/gives';
import { ReasonsResponseSchema } from '@/lib/schemas';
import { atLeast, useDemo } from '@/lib/store';
import type { Line, PackageId } from '@/lib/types';
import { cn } from '@/lib/utils';

const LINES: Line[] = ['renewal', 'credits', 'price'];
const LINE_PLAIN: Record<Line, string> = { renewal: 'Renewal', credits: 'Service credits', price: 'Price changes' };

/** Supplier-facing plain wording per line. No ₹, no costs, no pooled data. */
const wordingFor = (line: Line, group: string) => wordingLibrary.find((w) => w.line === line && w.wordingGroup === group)!;

export default function SupplierPortal() {
  const status = useDemo((s) => s.status);
  const selected = useDemo((s) => s.selectedPackages);
  const supplierPick = useDemo((s) => s.supplierPick);
  const submit = useDemo((s) => s.supplierSubmit);
  const setRole = useDemo((s) => s.setRole);

  const [pick, setPick] = useState<PackageId | undefined>();
  const [suggest, setSuggest] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loadingReasons, setLoadingReasons] = useState(true);

  useEffect(() => {
    // Opening the portal directly puts the presenter in the supplier's shoes (once, on mount).
    if (useDemo.getState().role !== 'supplier') setRole('supplier');
  }, [setRole]);

  const offered = useMemo(() => packageTemplates.filter((p) => selected.includes(p.id)), [selected]);
  const ids = useMemo(
    () => [...new Set(offered.flatMap((p) => LINES.map((l) => wordingFor(l, p.wordings[l]).id)).concat('P3'))],
    [offered],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reasons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wordingOptionIds: ids }) })
      .then((r) => r.json())
      .then((j) => !cancelled && setReasons(ReasonsResponseSchema.parse(j).reasons))
      .catch(() => !cancelled && setReasons(Object.fromEntries(ids.map((id) => [id, wordingLibrary.find((w) => w.id === id)!.plainReason]))))
      .finally(() => !cancelled && setLoadingReasons(false));
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const canRespond = status === 'with_supplier';
  const responded = atLeast(status, 'countered');

  const onSubmit = () => {
    if (!pick) {
      toast('Choose a package first');
      return;
    }
    const pkg = packageTemplates.find((p) => p.id === pick)!;
    const counter = suggest && pkg.wordings.price === 'cap_5' ? ({ line: 'price', group: 'cap_7' } as const) : undefined;
    submit(pick, counter);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-4 sm:-mx-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-medium text-ink">Supplier portal · CloudDesk</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">Concept</span>
        </div>
        <RoleSwitcher compact />
      </header>

      <div className="mt-8">
        <h1 className="text-[24px] font-normal text-ink">Choose a package</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5f6b6d]">
          Thanks for your proposed changes to the renewal. We have prepared {offered.length} ways to agree. Each one gives you something and asks
          for clear wording on renewal, service credits and price. Pick the one that works best for you.
        </p>
      </div>

      {!canRespond && !responded && (
        <div className="mt-6 rounded-xl border border-line bg-white px-5 py-4 text-sm text-[#5f6b6d]">
          No proposal is waiting for you yet. The customer’s team is still preparing it.{' '}
          <button type="button" className="text-teal-900 underline" onClick={() => setRole('lead')}>Back to procurement</button>
        </div>
      )}
      {responded && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-900/30 bg-teal-900/[0.05] px-5 py-4 text-sm text-teal-title">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Sent to Procurement: you picked package {supplierPick}{status === 'countered' ? ' and suggested one change' : ''}.</span>
          <Link href="/redlines/RL-CLOUDDESK" onClick={() => setRole('lead')} className="inline-flex items-center gap-1 text-teal-900 underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Switch back to the procurement lead
          </Link>
        </div>
      )}

      <div className={cn('mt-6 grid gap-4 lg:grid-cols-3', !canRespond && 'pointer-events-none opacity-60')}>
        {offered.map((p) => {
          const chosen = (pick ?? supplierPick) === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPick(p.id)}
              aria-pressed={chosen}
              disabled={!canRespond}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition',
                chosen ? 'border-teal-900 ring-2 ring-teal-900/20' : 'border-line hover:border-teal-900/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Package {p.id}</span>
                <span className={cn('h-4 w-4 rounded-full border', chosen ? 'border-[5px] border-teal-900' : 'border-[#c9d2d3]')} />
              </div>
              <h2 className="mt-1 text-[18px] text-ink">{p.name}</h2>
              <div className="mt-4 text-[11px] uppercase tracking-wide text-muted">You get</div>
              <ul className="mt-1 space-y-1 text-sm">
                {p.gives.map((g) => <li key={g}>{GIVE_SUPPLIER_LABEL[g]}</li>)}
              </ul>
              <div className="mt-4 text-[11px] uppercase tracking-wide text-muted">We agree that</div>
              <ul className="mt-1 space-y-3 text-sm">
                {LINES.map((l) => {
                  const w = wordingFor(l, p.wordings[l]);
                  return (
                    <li key={l}>
                      <div className="font-medium">{LINE_PLAIN[l]}</div>
                      <div className="text-[#3c4a4d]">“{w.text}”</div>
                      <div className="mt-0.5 text-xs text-teal-900">
                        {loadingReasons ? <span className="inline-block h-3 w-40 animate-pulse rounded bg-page-bg" /> : `Why: ${reasons[w.id] ?? w.plainReason}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </button>
          );
        })}
      </div>

      {canRespond && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0C5E69]" checked={suggest} onChange={(e) => setSuggest(e.target.checked)} />
            <span>
              <span className="font-medium">Suggest one change</span>
              <span className="block text-muted">You can propose one alternative on one line.</span>
            </span>
          </label>
          {suggest && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Line</span>
                <select className="h-9 w-full rounded-md border border-line bg-white px-2" defaultValue="price" aria-label="Line to change">
                  <option value="price">Price changes</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Alternative</span>
                <select className="h-9 w-full rounded-md border border-line bg-white px-2" defaultValue="cap_7" aria-label="Alternative wording">
                  <option value="cap_7">Yearly rise capped at 7%</option>
                </select>
              </label>
              <p className="text-xs text-teal-900 sm:col-span-2">Why: {reasons.P3 ?? wordingFor('price', 'cap_7').plainReason}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-sm text-muted">{pick ? `Package ${pick} selected.` : 'Select a package above.'}</span>
            <Button onClick={onSubmit} disabled={!pick}>
              {loadingReasons ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit to Procurement
            </Button>
          </div>
        </div>
      )}
      <p className="mt-10 text-[11px] text-muted">Concept prototype. All names and terms are fictional.</p>
    </div>
  );
}
