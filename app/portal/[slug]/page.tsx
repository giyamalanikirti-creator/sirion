'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RoleSwitcher } from '@/components/shell/RoleSwitcher';
import { Button, EmptyState } from '@/components/ui';
import { redlines, wordingLibrary } from '@/lib/data';
import { buildPackages } from '@/lib/engines/givegetEngine';
import { GIVE_SUPPLIER_LABEL } from '@/lib/engines/gives';
import { counterOptions } from '@/lib/engines/negotiation';
import { GROUP_LABEL } from '@/lib/format';
import { ReasonsResponseSchema } from '@/lib/schemas';
import { atLeast, useDemo, useNegotiation } from '@/lib/store';
import type { Counter, Line, PackageId } from '@/lib/types';
import { cn } from '@/lib/utils';

const LINE_PLAIN: Record<Line, string> = { renewal: 'Renewal', credits: 'Service credits', price: 'Price changes' };

/** Supplier-facing plain wording per line. No ₹, no costs, no pooled data. */
const wordingFor = (line: Line, group: string) => wordingLibrary.find((w) => w.line === line && w.wordingGroup === group)!;
const counterKey = (c: Counter) => `${c.line}:${c.group}`;

export default function SupplierPortal() {
  const { slug } = useParams<{ slug: string }>();
  const redline = redlines.find((r) => r.slug === slug);
  const redlineId = redline?.id ?? '';
  const n = useNegotiation(redlineId);
  const submit = useDemo((s) => s.supplierSubmit);
  const setRole = useDemo((s) => s.setRole);

  const [pick, setPick] = useState<PackageId | undefined>();
  const [suggest, setSuggest] = useState(false);
  const [counterChoice, setCounterChoice] = useState<string>('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reasonsDone, setLoadingDone] = useState(false);

  useEffect(() => {
    // Opening the portal directly puts the presenter in the supplier's shoes (once, on mount).
    if (useDemo.getState().role !== 'supplier') setRole('supplier');
  }, [setRole]);

  const selectedKey = (n?.selectedPackages ?? []).join(',');
  const offered = redlineId
    ? buildPackages({ redlineId }).filter((p) => selectedKey.split(',').includes(p.id)).sort((a, b) => a.id.localeCompare(b.id))
    : [];
  const chosen = offered.find((p) => p.id === pick);
  const options = chosen ? counterOptions(chosen.wordings, chosen.lines) : [];
  const ids = [
    ...new Set([
      ...offered.flatMap((p) => p.lines.map((l) => wordingFor(l, p.wordings[l]).id)),
      ...offered.flatMap((p) => counterOptions(p.wordings, p.lines).map((c) => wordingFor(c.line, c.group).id)),
    ]),
  ].filter((id) => wordingLibrary.find((w) => w.id === id)?.enforceable);
  // The effect keys on a string so it only refetches when the set of wordings changes.
  const idsKey = ids.join(',');
  const loadingReasons = ids.length > 0 && !reasonsDone;

  useEffect(() => {
    const wanted = idsKey ? idsKey.split(',') : [];
    if (!wanted.length) return;
    let cancelled = false;
    fetch('/api/reasons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wordingOptionIds: wanted, redlineId }) })
      .then((r) => r.json())
      .then((j) => !cancelled && setReasons(ReasonsResponseSchema.parse(j).reasons))
      .catch(() => !cancelled && setReasons(Object.fromEntries(wanted.map((id) => [id, wordingLibrary.find((w) => w.id === id)!.plainReason]))))
      .finally(() => !cancelled && setLoadingDone(true));
    return () => {
      cancelled = true;
    };
  }, [idsKey, redlineId]);

  if (!redline || !n) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Supplier not found"><Link href="/portal" className="text-teal-900 underline">All suppliers</Link></EmptyState>
      </div>
    );
  }

  const status = n.status;
  const canRespond = status === 'with_supplier';
  const responded = atLeast(status, 'countered');
  const activeCounter = suggest ? options.find((o) => counterKey(o) === counterChoice) ?? options[0] : undefined;

  const onSubmit = () => {
    if (!pick) {
      toast('Choose a package first');
      return;
    }
    submit(redline.id, pick, activeCounter);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-4 sm:-mx-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/portal" className="text-muted hover:text-ink" aria-label="All suppliers"><ArrowLeft className="h-4 w-4" /></Link>
          <span className="text-[17px] font-medium text-ink">Supplier portal · {redline.supplier}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">Concept</span>
        </div>
        <RoleSwitcher compact />
      </header>

      <div className="mt-8">
        <h1 className="text-[24px] font-normal text-ink">Choose a package</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#5f6b6d]">
          Thanks for your proposed changes to the renewal. We have prepared {offered.length || 'some'} way{offered.length === 1 ? '' : 's'} to agree. Each one sets clear wording on the terms you changed. Pick the one that works best for you.
        </p>
      </div>

      {!canRespond && !responded && (
        <div className="mt-6 rounded-xl border border-line bg-white px-5 py-4 text-sm text-[#5f6b6d]">
          No proposal is waiting for you yet. The customer’s team is still preparing it.{' '}
          <Link href={`/redlines/${redline.id}`} onClick={() => setRole('lead')} className="text-teal-900 underline">Back to procurement</Link>
        </div>
      )}
      {responded && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-900/30 bg-teal-900/[0.05] px-5 py-4 text-sm text-teal-title">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Sent to Procurement: you picked package {n.supplierPick}
            {n.counter ? ' and suggested one change' : ''}.
          </span>
          <Link href={`/redlines/${redline.id}`} onClick={() => setRole('lead')} className="inline-flex items-center gap-1 text-teal-900 underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Switch back to the procurement lead
          </Link>
        </div>
      )}

      <div className={cn('mt-6 grid gap-4', offered.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2', !canRespond && 'pointer-events-none opacity-60')}>
        {offered.map((p) => {
          const isChosen = (pick ?? n.supplierPick) === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPick(p.id);
                setCounterChoice('');
              }}
              aria-pressed={isChosen}
              disabled={!canRespond}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition',
                isChosen ? 'border-teal-900 ring-2 ring-teal-900/20' : 'border-line hover:border-teal-900/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Package {p.id}</span>
                <span className={cn('h-4 w-4 rounded-full border', isChosen ? 'border-[5px] border-teal-900' : 'border-[#c9d2d3]')} />
              </div>
              <h2 className="mt-1 text-[18px] text-ink">{p.id === 'D' ? 'Keep the current terms' : p.name}</h2>
              <div className="mt-4 text-[11px] uppercase tracking-wide text-muted">You get</div>
              <ul className="mt-1 space-y-1 text-sm">
                {p.gives.length ? p.gives.map((g) => <li key={g.id}>{GIVE_SUPPLIER_LABEL[g.id]}</li>) : <li>A quick renewal on the terms below</li>}
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
          <label className={cn('flex items-start gap-3 text-sm', !options.length && 'opacity-50')}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#0C5E69]"
              checked={suggest && options.length > 0}
              disabled={!options.length}
              onChange={(e) => setSuggest(e.target.checked)}
            />
            <span>
              <span className="font-medium">Suggest one change</span>
              <span className="block text-muted">
                {pick ? (options.length ? 'You can propose one alternative on one term.' : 'This package has no alternative terms to suggest.') : 'Select a package first.'}
              </span>
            </span>
          </label>
          {suggest && activeCounter && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Alternative</span>
                <select
                  className="h-9 w-full rounded-md border border-line bg-white px-2"
                  value={counterKey(activeCounter)}
                  onChange={(e) => setCounterChoice(e.target.value)}
                  aria-label="Alternative wording"
                >
                  {options.map((o) => (
                    <option key={counterKey(o)} value={counterKey(o)}>
                      {LINE_PLAIN[o.line]}: {GROUP_LABEL[o.group]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="self-end text-xs text-teal-900">
                Why: {reasons[wordingFor(activeCounter.line, activeCounter.group).id] ?? wordingFor(activeCounter.line, activeCounter.group).plainReason}
              </p>
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
