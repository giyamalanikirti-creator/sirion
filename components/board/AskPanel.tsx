'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUp, ChevronRight, Database, Loader2, PanelRightClose, Sparkles, Users, Wrench } from 'lucide-react';
import { AiBadge, Chip } from '@/components/ui';
import { Logo } from '@/components/shell/Logo';
import { type AskResponse, AskResponseSchema, ASK_LIMITS } from '@/lib/schemas';
import { useDemo } from '@/lib/store';

export const SUGGESTED = [
  'Why is the credits line ₹3.2 lakh?',
  'What if we accept a 15-day claim window?',
  'Show packages without the 3-year term',
];

type Turn = { question: string; response?: AskResponse; error?: string };

const chipIcon = (kind?: string) =>
  kind === 'pooled' ? <Users className="h-3 w-3" /> : kind === 'data' ? <Database className="h-3 w-3" /> : <Wrench className="h-3 w-3" />;

export function AskPanel({ redlineId, onClose }: { redlineId: string; onClose?: () => void }) {
  const role = useDemo((s) => s.role);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    const history = turns
      .filter((t) => t.response)
      .flatMap((t) => [
        { role: 'user' as const, content: t.question },
        { role: 'assistant' as const, content: t.response!.answer },
      ]);
    setTurns((ts) => [...ts, { question }]);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: question }].slice(-ASK_LIMITS.maxMessages), redlineId, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'The assistant could not answer');
      const response = AskResponseSchema.parse(json);
      setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, response } : t)));
    } catch (e) {
      setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? { ...t, error: (e as Error).message } : t)));
    } finally {
      setBusy(false);
    }
  };

  const lastSource = [...turns].reverse().find((t) => t.response)?.response?.source;

  return (
    <aside aria-label="Ask Cost of Yes" className="flex h-full flex-col rounded-[22px] border border-line bg-white shadow-card">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7" color="#0C5E69" />
          <h2 className="text-[17px] text-teal-title">Ask Cost of Yes</h2>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Collapse Ask panel" className="rounded p-1 text-muted hover:bg-page-bg">
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="pt-2">
            <p className="text-sm text-muted">
              Ask about this negotiation. Every number comes from the price engine, with the contracts it rests on.
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  disabled={busy}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-left text-sm text-ink hover:border-teal-900/40 hover:bg-teal-900/[0.03]"
                >
                  <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-900" /> {q}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <h3 className="text-[19px] font-normal leading-snug text-teal-title">{t.question}</h3>
            {!t.response && !t.error && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Running the numbers…
              </div>
            )}
            {t.error && <p className="rounded-xl bg-danger/5 px-3 py-2 text-sm text-danger">{t.error}</p>}
            {t.response && (
              <>
                {t.response.sources.length > 0 && (
                  <div className="rounded-2xl border border-line p-4">
                    <div className="mb-2 flex items-center gap-2 text-[15px] text-teal-title">
                      <Logo className="h-5 w-5" color="#0C5E69" /> Sources
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {t.response.sources.map((c) => (
                        <Chip key={c.label} icon={chipIcon(c.kind)} tone="muted">{c.label}</Chip>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-line p-4">
                  <div className="mb-2 flex items-center gap-2 text-[15px] text-teal-title">
                    <Logo className="h-5 w-5" color="#0C5E69" /> Response
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{t.response.answer}</p>
                  {t.response.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.response.links.map((l) => (
                        <Link
                          key={l.href + l.label}
                          href={l.href}
                          scroll={false}
                          className="inline-flex items-center gap-1.5 rounded-md bg-teal-900 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                        >
                          {l.label} <ArrowRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
        {turns.length > 0 && !busy && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED.filter((q) => !turns.some((t) => t.question === q)).map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-teal-900">
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <div className="flex items-center gap-2 rounded-full border border-[#c9d2d3] bg-white py-1.5 pl-4 pr-1.5 focus-within:border-teal-900">
          <label htmlFor="ask-input" className="sr-only">Type your question</label>
          <input
            id="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={ASK_LIMITS.maxUserChars}
            placeholder="Type your question here"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-900 text-white hover:bg-teal-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted">
          <span>Calculates and drafts only. Cannot send, approve or sign.</span>
          <AiBadge source={lastSource} />
        </div>
      </form>
    </aside>
  );
}
