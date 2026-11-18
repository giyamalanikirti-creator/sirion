'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Scale, Tag, UserRound } from 'lucide-react';
import { AiBadge, Button, EmptyState, GROUP_TONE, StatusPill } from '@/components/ui';
import { wordDiff } from '@/lib/diff';
import { GROUP_LABEL } from '@/lib/format';
import { InWords, inWords } from '@/lib/nextStep';
import type { PriceTag, Redline, RedlineChange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';
import type { BoardTab } from './NextStepPanel';

function Diff({ oldText, newText, supplier }: { oldText: string; newText: string; supplier: string }) {
  const parts = wordDiff(oldText, newText);
  return (
    <div className="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">Current signed contract</div>
        <p>{parts.filter((p) => p.type !== 'ins').map((p, i) => <span key={i} className={p.type === 'del' ? 'diff-del' : undefined}>{p.text}</span>)}</p>
      </div>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">{supplier}’s proposed renewal</div>
        <p>{parts.filter((p) => p.type !== 'del').map((p, i) => <span key={i} className={p.type === 'ins' ? 'diff-ins' : undefined}>{p.text}</span>)}</p>
      </div>
    </div>
  );
}

function ChangeCard({
  ch, redline, tag, onGoTags, openByDefault,
}: { ch: RedlineChange; redline: Redline; tag?: PriceTag; onGoTags: () => void; openByDefault?: boolean }) {
  const { n } = useBoard();
  const [showClause, setShowClause] = useState(!!openByDefault);
  const cls = n.sortResult?.results.find((r) => r.no === ch.no);
  const decision = n.legalDecisions[ch.no];
  return (
    <article className={cn('rounded-2xl border bg-white p-5 shadow-card', cls?.group === 'money' ? 'border-periwinkle/40' : 'border-line')}>
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-page-bg text-xs">{ch.no}</span>
          Clause {ch.clause} · {ch.title}
        </div>
        {cls ? (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={GROUP_TONE[cls.group]}>
              {cls.group === 'money' ? 'affects what you pay' : cls.group === 'legal' ? 'legal review' : 'routine'}
              {cls.wordingGroup ? ` · ${GROUP_LABEL[cls.wordingGroup].toLowerCase()}` : ''}
            </StatusPill>
            <span className="text-xs text-muted">{Math.round(cls.confidence * 100)}% sure</span>
          </div>
        ) : (
          <StatusPill tone="grey">Not analysed</StatusPill>
        )}
      </header>

      <p className={cn('text-[15px] leading-relaxed', cls?.group === 'money' ? 'text-ink' : 'text-ink/90')}>{ch.plain}</p>

      <button
        type="button"
        onClick={() => setShowClause((v) => !v)}
        aria-expanded={showClause}
        className="mt-2 inline-flex items-center gap-1 text-xs text-teal-900 hover:underline"
      >
        <FileText className="h-3.5 w-3.5" /> {showClause ? 'Hide' : 'Show'} the clause text
      </button>
      {showClause && (
        <div className="mt-3 rounded-xl bg-page-bg/60 p-3">
          <Diff oldText={ch.oldText} newText={ch.newText} supplier={redline.supplier} />
        </div>
      )}

      {cls && (
        <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3 text-sm">
          {cls.confidence < 0.7 ? (
            <span className="flex items-center gap-1.5 text-danger"><UserRound className="h-4 w-4" /> Needs a person</span>
          ) : cls.group === 'harmless' ? (
            <span className="flex items-center gap-1.5 text-teal-900"><CheckCircle2 className="h-4 w-4" /> Approved by Cost of Yes · logged</span>
          ) : cls.group === 'legal' ? (
            <span className="flex items-center gap-1.5 text-indigo">
              <Scale className="h-4 w-4" />
              {decision ? `Legal: ${decision}` : <Link href="/legal" className="hover:underline">With Legal for review</Link>}
            </span>
          ) : (
            <button type="button" onClick={onGoTags} className="flex items-center gap-1.5 font-medium text-teal-900 hover:underline">
              <Tag className="h-4 w-4" />
              {tag && Number.isFinite(tag.costLakh) ? `See the financial impact` : 'See the estimate'} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export function ChangesTab({ redline, tags, onGoTags }: { redline: Redline; tags: PriceTag[]; onGoTags: () => void; onGoTab?: (t: BoardTab) => void }) {
  const { n } = useBoard();
  const sortResult = n.sortResult;

  // After analysis: the service-credit change first, then the other commercial changes, then legal.
  // Routine edits fold into one collapsed row.
  const LINE_ORDER = ['credits', 'renewal', 'price'];
  const clsOf = (no: number) => sortResult?.results.find((r) => r.no === no);
  const rank = (no: number) => {
    const c = clsOf(no);
    if (!c) return 99;
    if (c.group === 'money') return LINE_ORDER.indexOf(c.line ?? '');
    return c.group === 'legal' ? 10 : 20;
  };
  const isRoutine = (no: number) => {
    const c = clsOf(no);
    return !!c && c.group === 'harmless' && c.confidence >= 0.7;
  };
  const ordered = sortResult ? [...redline.changes].filter((c) => !isRoutine(c.no)).sort((a, b) => rank(a.no) - rank(b.no)) : redline.changes;
  const routine = sortResult ? redline.changes.filter((c) => isRoutine(c.no)) : [];
  const count = (g: string) => sortResult?.results.filter((r) => r.group === g).length ?? 0;
  const [money, legal, harmless] = [count('money'), count('legal'), count('harmless')];

  const summary = [
    money ? `${InWords(money)} change${money === 1 ? '' : 's'} could affect what you pay.` : 'None of the changes affect what you pay.',
    legal ? `${InWords(legal)} need${legal === 1 ? 's' : ''} legal review.` : '',
    harmless ? `${InWords(harmless)} ${harmless === 1 ? 'is' : 'are'} routine.` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white px-6 py-4 shadow-card">
        <div className="text-xs text-muted">
          Comparing <strong className="font-medium text-ink">Current signed contract</strong> with{' '}
          <strong className="font-medium text-ink">{redline.supplier}’s proposed renewal</strong>
        </div>
        {sortResult ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[17px] text-teal-title">{summary}</span>
            <AiBadge source={sortResult.source} />
            {money > 0 && (
              <Button variant="ghost" size="sm" onClick={onGoTags}>See the financial impact <ArrowRight className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        ) : (
          <p className="mt-1 text-[15px] text-ink">
            {redline.supplier} proposed {inWords(redline.changes.length)} changes. Use <strong className="font-medium">Analyse</strong> above to find which ones affect what you pay.
          </p>
        )}
      </div>

      {ordered.map((ch) => (
        <ChangeCard
          key={ch.no}
          ch={ch}
          redline={redline}
          tag={tags.find((t) => t.line === clsOf(ch.no)?.line)}
          onGoTags={onGoTags}
        />
      ))}

      {routine.length > 0 && (
        <details className="group rounded-2xl border border-line bg-white shadow-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm">
            <span className="flex items-center gap-2 text-teal-900">
              <CheckCircle2 className="h-4 w-4" />
              {InWords(routine.length)} routine edit{routine.length === 1 ? '' : 's'} approved by Cost of Yes and logged
              <span className="text-muted">({routine.map((c) => c.title.toLowerCase()).join(', ')})</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            {routine.map((ch) => <ChangeCard key={ch.no} ch={ch} redline={redline} onGoTags={onGoTags} />)}
          </div>
        </details>
      )}
      {redline.changes.length === 0 && <EmptyState title="No changes in this redline" />}
    </div>
  );
}
