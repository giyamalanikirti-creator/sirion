'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, MessageSquare } from 'lucide-react';
import { AskPanel } from '@/components/board/AskPanel';
import { BoardHeader } from '@/components/board/BoardHeader';
import { ChangesTab } from '@/components/board/ChangesTab';
import { PackagesTab } from '@/components/board/PackagesTab';
import { PriceTagsTab } from '@/components/board/PriceTagsTab';
import { SigningTab } from '@/components/board/SigningTab';
import { NextStepPanel } from '@/components/board/NextStepPanel';
import { EmptyState } from '@/components/ui';
import { redlines } from '@/lib/data';
import { redlinePriceTags } from '@/lib/engines/redline';
import { atLeast, hasMoneyLines, STORY_REDLINE, useDemo, useNegotiation } from '@/lib/store';
import { RedlineProvider } from '@/components/board/context';
import { useMediaQuery } from '@/lib/useMedia';
import { cn } from '@/lib/utils';

type Tab = 'changes' | 'tags' | 'packages' | 'signing';
const TABS: { id: Tab; label: string }[] = [
  { id: 'changes', label: 'Changes' },
  { id: 'tags', label: 'Financial impact' },
  { id: 'packages', label: 'Compare offers' },
  { id: 'signing', label: 'Signing' },
];

function Board() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const redlineId = decodeURIComponent(id);
  const status = useNegotiation(redlineId)?.status ?? 'received';
  const completeStep = useDemo((s) => s.completeStep);
  // The assistant stays closed so the evidence cards get the width; it opens when someone asks about an estimate.
  const [askOpen, setAskOpen] = useState(false);
  const [askRequest, setAskRequest] = useState<{ text: string; id: number } | undefined>();
  const askAbout = (text: string) => {
    setAskOpen(true);
    setAskRequest({ text, id: Date.now() });
  };
  const wide = useMediaQuery('(min-width: 1280px)');

  const redline = redlines.find((r) => r.id === redlineId);
  const fromUrl = search.get('tab') as Tab | null;
  const tab: Tab = fromUrl && TABS.some((t) => t.id === fromUrl) ? fromUrl : 'changes';
  const money = redline ? hasMoneyLines(redline.id) : false;
  const signingEnabled = money ? atLeast(status, 'agreed') : atLeast(status, 'sorted');

  const setTab = (t: Tab) => router.replace(`${pathname}?tab=${t}`, { scroll: false });

  const dismissWelcome = useDemo((s) => s.dismissWelcome);
  useEffect(() => {
    if (redline?.id === STORY_REDLINE) completeStep(1);
    // Opening any redline makes this a returning user: the dashboard then shows the work queue.
    if (redline) dismissWelcome();
  }, [redline, completeStep, dismissWelcome]);

  const data = useMemo(() => {
    if (!redline) return null;
    return redlinePriceTags(redline.id);
  }, [redline]);

  if (!redline) return <EmptyState title="Redline not found"><Link className="text-teal-900 underline" href="/redlines">Back to the inbox</Link></EmptyState>;
  if (!data) return null;

  return (
    <RedlineProvider value={redline.id}>
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <Link href="/redlines" className="inline-flex items-center gap-1 text-sm text-muted hover:text-teal-900">
          <ArrowLeft className="h-4 w-4" /> Redline inbox
        </Link>
        <BoardHeader
          contract={data.contract}
          totalLakh={data.totalLakh}
          vsCurrentLakh={data.vsCurrentLakh}
          pctOfFee={data.pctOfFee}
          moneyLines={data.lines.length}
          unpriced={data.unpriced.length}
        />
        <NextStepPanel onGoTab={setTab} />

        <div className="flex items-center justify-between gap-3 border-b border-line">
          <div role="tablist" aria-label="Negotiation board" className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const disabled = t.id === 'signing' && !signingEnabled;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  aria-disabled={disabled}
                  title={disabled ? 'Enabled once the deal is agreed' : undefined}
                  onClick={() => !disabled && setTab(t.id)}
                  className={cn(
                    '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm',
                    tab === t.id ? 'border-teal-900 text-teal-900' : 'border-transparent text-muted hover:text-ink',
                    disabled && 'cursor-not-allowed opacity-50 hover:text-muted',
                  )}
                >
                  {disabled && <Lock className="h-3 w-3" />}
                  {t.label}
                </button>
              );
            })}
          </div>
          {!askOpen && (
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              className="mb-1 hidden shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-teal-900 xl:flex"
            >
              <MessageSquare className="h-4 w-4" /> Ask Cost of Yes
            </button>
          )}
        </div>

        <div role="tabpanel">
          {tab === 'changes' && <ChangesTab redline={redline} tags={data.tags} onGoTags={() => setTab('tags')} onGoTab={setTab} />}
          {tab === 'tags' && (
            <PriceTagsTab
              tags={data.tags}
              comparisons={data.comparisons}
              totalLakh={data.totalLakh}
              vsCurrentLakh={data.vsCurrentLakh}
              contract={data.contract}
              onGoPackages={() => setTab('packages')}
              onGoTab={setTab}
              onAsk={askAbout}
            />
          )}
          {tab === 'packages' && <PackagesTab onGoTab={setTab} />}
          {tab === 'signing' && <SigningTab />}
        </div>

        {/* Ask panel below the board on smaller screens */}
        {!wide && (
          <div className="h-[640px]">
            <AskPanel redlineId={redline.id} request={askRequest} />
          </div>
        )}
      </div>

      {wide && askOpen && (
        <div className="sticky top-[88px] h-[calc(100vh-112px)] w-[360px] shrink-0">
          <AskPanel redlineId={redline.id} request={askRequest} onClose={() => setAskOpen(false)} />
        </div>
      )}
    </div>
    </RedlineProvider>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-line bg-white" />}>
      <Board />
    </Suspense>
  );
}
