'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Disclaimer, PageHeader } from '@/components/ui';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: React.ReactNode } }).props.children);
  return '';
}

export function StoryView({ markdown }: { markdown: string }) {
  const toc = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => ({ title: m[1].trim(), id: slug(m[1]) }));
  return (
    <>
      <PageHeader title="The story behind Cost of Yes" />
      <div className="mb-6 rounded-2xl border border-lime bg-lime/20 px-5 py-3">
        <Disclaimer className="text-[13px] text-ink" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Contents" className="lg:sticky lg:top-[88px] lg:self-start">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted">Contents</div>
          <ol className="space-y-1 text-sm">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="block rounded-md px-2 py-1 text-ink hover:bg-white hover:text-teal-900">{t.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="prose-story max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-card md:p-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ h2: ({ children }) => <h2 id={slug(textOf(children))}>{children}</h2> }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </>
  );
}
