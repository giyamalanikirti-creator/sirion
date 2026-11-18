'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { STORY_REDLINE, useDemo } from '@/lib/store';
import { RedlineProvider } from '@/components/board/context';
import { useMediaQuery } from '@/lib/useMedia';

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
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <BoardHeader
            contract={data.contract}
            moneyLines={data.lines.length}
            tab={tab}
            onTab={setTab}
            askOpen={wide && askOpen}
            onAsk={() => {
              setAskOpen(true);
              if (!wide) setTimeout(() => document.getElementById('ask-panel')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
          />
          <NextStepPanel onGoTab={setTab} />

          <div>
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

          {/* Assistant below the stage on smaller screens */}
          {!wide && (
            <div id="ask-panel" className="h-[600px]">
              <AskPanel redlineId={redline.id} request={askRequest} />
            </div>
          )}
        </div>

        {wide && askOpen && (
          <div className="sticky top-[72px] h-[calc(100vh-88px)] w-[360px] shrink-0">
            <AskPanel redlineId={redline.id} request={askRequest} onClose={() => setAskOpen(false)} />
          </div>
        )}
      </div>
    </RedlineProvider>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-lg border border-line bg-white" />}>
      <Board />
    </Suspense>
  );
}
