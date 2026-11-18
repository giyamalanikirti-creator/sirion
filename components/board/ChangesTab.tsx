'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown, Scale, UserRound } from 'lucide-react';
import { AiBadge, Button, EmptyState, GROUP_TONE, StatusPill } from '@/components/ui';
import { wordDiff } from '@/lib/diff';
import { GROUP_LABEL } from '@/lib/format';
import { InWords } from '@/lib/nextStep';
import type { PriceTag, Redline, RedlineChange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useBoard } from './context';
import type { BoardTab } from './NextStepPanel';

/** Two aligned document columns; only the changed words are highlighted (blue = current, amber = proposed). */
function DocColumns({ ch, supplier }: { ch: RedlineChange; supplier: string }) {
  const parts = wordDiff(ch.oldText, ch.newText);
  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
      <div className="md:pr-5">
        <div className="mb-1 text-[12px] font-medium text-agreement md:hidden">Current signed contract</div>
        <p className="text-[14px] leading-relaxed text-ink">
          {parts.filter((p) => p.type !== 'ins').map((p, i) => <span key={i} className={p.type === 'del' ? 'diff-del' : undefined}>{p.text}</span>)}
        </p>
      </div>
      <div className="md:pl-5">
        <div className="mb-1 text-[12px] font-medium text-proposed md:hidden">{supplier}’s proposed renewal</div>
        <p className="text-[14px] leading-relaxed text-ink">
          {parts.filter((p) => p.type !== 'del').map((p, i) => <span key={i} className={p.type === 'ins' ? 'diff-ins' : undefined}>{p.text}</span>)}
        </p>
      </div>
    </div>
  );
}

function ChangeRow({ ch, redline, onGoTags }: { ch: RedlineChange; redline: Redline; onGoTags: () => void }) {
  const { n } = useBoard();
  const cls = n.sortResult?.results.find((r) => r.no === ch.no);
  const decision = n.legalDecisions[ch.no];
  const money = cls?.group === 'money';
  return (
    <article className="px-5 py-4" aria-labelledby={`ch-${ch.no}`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="num text-[12px] text-muted">{ch.no}.</span>
        <h3 id={`ch-${ch.no}`} className="text-[14px] font-semibold text-ink">Clause {ch.clause} · {ch.title}</h3>
        {cls ? (
          <>
            <StatusPill tone={GROUP_TONE[cls.group]}>
              {money ? 'Affects what you pay' : cls.group === 'legal' ? 'Needs legal review' : 'Routine'}
            </StatusPill>
            {cls.wordingGroup && <span className="text-[12px] text-muted">{GROUP_LABEL[cls.wordingGroup]}</span>}
            <span className="ml-auto text-[12px] text-muted">{Math.round(cls.confidence * 100)}% confidence</span>
          </>
        ) : (
          <StatusPill tone="grey" className="ml-auto">Not analysed</StatusPill>
        )}
      </header>

      <p className={cn('mt-2 max-w-[80ch] leading-relaxed text-ink', money ? 'text-[15px] font-medium' : 'text-[14px]')}>{ch.plain}</p>

      <div className="mt-3 rounded-md border border-line bg-page-bg/50 p-3">
        <DocColumns ch={ch} supplier={redline.supplier} />
      </div>

      {cls && (
        <footer className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[13px]">
          {cls.confidence < 0.7 ? (
            <span className="flex items-center gap-1.5 text-danger"><UserRound className="h-4 w-4" /> Needs a person to classify</span>
          ) : cls.group === 'harmless' ? (
            <span className="flex items-center gap-1.5 text-positive"><CheckCircle2 className="h-4 w-4" /> Approved by Cost of Yes · logged</span>
          ) : cls.group === 'legal' ? (
            <span className="flex items-center gap-1.5 text-agreement">
              <Scale className="h-4 w-4" />
              {decision ? `Legal decision: ${decision}` : <Link href="/legal" className="hover:underline">With Legal for review</Link>}
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={onGoTags}>Review financial impact <ArrowRight className="h-3.5 w-3.5" /></Button>
          )}
        </footer>
      )}
    </article>
  );
}

export function ChangesTab({ redline, onGoTags }: { redline: Redline; tags: PriceTag[]; onGoTags: () => void; onGoTab?: (t: BoardTab) => void }) {
  const { n } = useBoard();
  const sortResult = n.sortResult;

  // After analysis: commercial changes first (service credits leading), then legal; routine edits collapse.
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

  if (!redline.changes.length) return <EmptyState title="No changes in this redline" />;

  return (
    <section className="rounded-lg border border-line bg-white" aria-label="Supplier changes">
      <div className="border-b border-line px-5 py-4">
        {sortResult ? (
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-semibold text-ink">{summary}</h2>
            <AiBadge source={sortResult.source} />
          </div>
        ) : (
          <h2 className="text-[18px] font-semibold text-ink">
            {redline.supplier} proposed {redline.changes.length} change{redline.changes.length === 1 ? '' : 's'} to your contract
          </h2>
        )}
        <p className="mt-0.5 text-[13px] text-muted">
          {sortResult ? 'Commercial changes first. Routine edits are logged and collapsed below.' : `Use “Analyse ${redline.changes.length} changes” above to find which ones affect what you pay.`}
        </p>
      </div>

      {/* Column headings once, aligned with the document columns. */}
      <div className="hidden grid-cols-2 border-b border-line bg-page-bg/60 px-5 py-2 text-[12px] font-semibold md:grid">
        <span className="flex items-center gap-2 pr-5 text-agreement"><span className="h-2.5 w-2.5 rounded-sm bg-agreement" aria-hidden /> Current signed contract</span>
        <span className="flex items-center gap-2 pl-5 text-proposed"><span className="h-2.5 w-2.5 rounded-sm bg-proposed" aria-hidden /> {redline.supplier}’s proposed renewal</span>
      </div>

      <div className="divide-y divide-line">
        {ordered.map((ch) => <ChangeRow key={ch.no} ch={ch} redline={redline} onGoTags={onGoTags} />)}
      </div>

      {routine.length > 0 && (
        <details className="group border-t border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-[14px] hover:bg-page-bg/60">
            <span className="flex items-center gap-2 text-positive">
              <CheckCircle2 className="h-4 w-4" />
              {InWords(routine.length)} routine edit{routine.length === 1 ? '' : 's'} approved and logged
              <span className="text-muted">({routine.map((c) => c.title.toLowerCase()).join(', ')})</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-line border-t border-line">
            {routine.map((ch) => <ChangeRow key={ch.no} ch={ch} redline={redline} onGoTags={onGoTags} />)}
          </div>
        </details>
      )}
    </section>
  );
}
