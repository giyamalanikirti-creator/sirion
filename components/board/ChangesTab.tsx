'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Scale, Sparkles, Tag, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AiBadge, Button, EmptyState, GROUP_TONE, StatusPill } from '@/components/ui';
import { wordDiff } from '@/lib/diff';
import { formatLakh, GROUP_LABEL } from '@/lib/format';
import { SortResponseSchema } from '@/lib/schemas';
import { useDemo } from '@/lib/store';
import type { PriceTag, Redline, SortResult } from '@/lib/types';

function Diff({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = wordDiff(oldText, newText);
  return (
    <div className="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Current</div>
        <p>{parts.filter((p) => p.type !== 'ins').map((p, i) => <span key={i} className={p.type === 'del' ? 'diff-del' : undefined}>{p.text}</span>)}</p>
      </div>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">CloudDesk proposes</div>
        <p>{parts.filter((p) => p.type !== 'del').map((p, i) => <span key={i} className={p.type === 'ins' ? 'diff-ins' : undefined}>{p.text}</span>)}</p>
      </div>
    </div>
  );
}

export function ChangesTab({ redline, tags, onGoTags }: { redline: Redline; tags: PriceTag[]; onGoTags: () => void }) {
  const sortResult = useDemo((s) => s.sortResult);
  const sort = useDemo((s) => s.sort);
  const legalDecision = useDemo((s) => s.legalDecision);
  const [loading, setLoading] = useState(false);

  const runSort = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sort', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ redlineId: redline.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Sort failed');
      const parsed = SortResponseSchema.parse(await res.json()) as SortResult;
      sort(parsed);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const counts = sortResult && {
    harmless: sortResult.results.filter((r) => r.group === 'harmless').length,
    legal: sortResult.results.filter((r) => r.group === 'legal').length,
    money: sortResult.results.filter((r) => r.group === 'money').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        {sortResult ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-teal-900" />
            <span>
              {redline.changes.length} changes sorted: {counts!.harmless} harmless approved and logged · {counts!.legal} sent to legal ·{' '}
              <strong className="font-medium text-teal-900">{counts!.money} money lines</strong> priced
            </span>
            <AiBadge source={sortResult.source} />
          </div>
        ) : (
          <div className="text-sm text-muted">
            {redline.changes.length} changes from CloudDesk. Sort them into harmless, legal and money before anyone reads every line.
          </div>
        )}
        {!sortResult ? (
          <Button onClick={runSort} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Sorting…' : 'Sort changes'}
          </Button>
        ) : (
          <Button variant="outline" onClick={onGoTags}>
            See price tags <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {redline.changes.map((ch) => {
        const cls = sortResult?.results.find((r) => r.no === ch.no);
        const tag = cls?.group === 'money' ? tags.find((t) => t.line === cls.line) : undefined;
        const needsPerson = cls && cls.confidence < 0.7;
        return (
          <article key={ch.no} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-page-bg text-xs text-muted">{ch.no}</span>
                <h3 className="text-[15px] text-teal-title">
                  Clause {ch.clause} · {ch.title}
                </h3>
              </div>
              {cls ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={GROUP_TONE[cls.group]}>
                    {cls.group}
                    {cls.wordingGroup ? ` · ${GROUP_LABEL[cls.wordingGroup].toLowerCase()}` : ''}
                  </StatusPill>
                  <span className="text-xs text-muted">{Math.round(cls.confidence * 100)}% sure</span>
                </div>
              ) : loading ? (
                <span className="h-5 w-24 animate-pulse rounded-full bg-page-bg" />
              ) : (
                <StatusPill tone="grey">Not sorted</StatusPill>
              )}
            </header>
            <Diff oldText={ch.oldText} newText={ch.newText} />
            {cls && (
              <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                <span className="text-muted">{cls.reason}</span>
                {needsPerson ? (
                  <span className="flex items-center gap-1.5 text-danger"><UserRound className="h-4 w-4" /> Needs a person</span>
                ) : cls.group === 'harmless' ? (
                  <span className="flex items-center gap-1.5 text-teal-900"><CheckCircle2 className="h-4 w-4" /> Approved by Cost of Yes · logged</span>
                ) : cls.group === 'legal' ? (
                  <span className="flex items-center gap-1.5 text-indigo">
                    <Scale className="h-4 w-4" />
                    {legalDecision ? `Legal: ${legalDecision}` : 'Sent to legal'}
                  </span>
                ) : (
                  <button type="button" onClick={onGoTags} className="flex items-center gap-1.5 font-medium text-teal-900 hover:underline">
                    <Tag className="h-4 w-4" /> Price tag ready{tag ? `: ${formatLakh(tag.costLakh)} a year` : ''}
                  </button>
                )}
              </footer>
            )}
          </article>
        );
      })}
      {redline.changes.length === 0 && <EmptyState title="No changes in this redline" />}
    </div>
  );
}
