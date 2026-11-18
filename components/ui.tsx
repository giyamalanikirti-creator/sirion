import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// SirionCard: white, 16px radius, 1px border, soft shadow, 24px padding.
// ---------------------------------------------------------------------------
export function SirionCard({
  title, action, children, className, bodyClassName, menu = true, id,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  menu?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn('rounded-2xl border border-line bg-card shadow-card', className)}>
      {title !== undefined && (
        <header className="mx-6 flex min-h-[60px] items-center justify-between gap-3 border-b border-line py-3">
          <h2 className="text-[15px] font-normal text-teal-title">{title}</h2>
          <div className="flex items-center gap-2">
            {action}
            {menu && (
              <button type="button" aria-label="Card menu" className="rounded p-1 text-muted hover:bg-page-bg">
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>
      )}
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI tile: dark label, big teal light numeral, muted caption.
// ---------------------------------------------------------------------------
export function KpiTile({
  label, value, caption, small, className,
}: { label: React.ReactNode; value: React.ReactNode; caption?: React.ReactNode; small?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className={cn('text-ink', small ? 'text-[15px]' : 'text-[20px]')}>{label}</div>
      <div className={cn('font-light leading-none tracking-tight text-teal-900', small ? 'my-2 text-[36px]' : 'my-3 text-[56px]')}>
        {value}
      </div>
      {caption && <div className="w-full max-w-[260px] border-t border-line pt-2 text-[14px] text-muted">{caption}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips and pills
// ---------------------------------------------------------------------------
export function Chip({
  children, icon, className, tone = 'default', title,
}: { children: React.ReactNode; icon?: React.ReactNode; className?: string; tone?: 'default' | 'teal' | 'muted'; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        tone === 'teal' && 'border-teal-900/30 bg-teal-900/5 text-teal-900',
        tone === 'default' && 'border-line bg-white text-ink',
        tone === 'muted' && 'border-line bg-page-bg text-muted',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const PILL_TONES = {
  teal: 'bg-teal-900/10 text-teal-900',
  mint: 'bg-mint/50 text-teal-title',
  periwinkle: 'bg-periwinkle/15 text-[#4b53c4]',
  lime: 'bg-lime/40 text-[#5b5e12]',
  grey: 'bg-page-bg text-muted',
  danger: 'bg-danger/10 text-danger',
  indigo: 'bg-indigo/10 text-indigo',
} as const;

export function StatusPill({
  children, tone = 'teal', className, dot,
}: { children: React.ReactNode; tone?: keyof typeof PILL_TONES; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', PILL_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const GROUP_TONE = { harmless: 'mint', legal: 'indigo', money: 'periwinkle' } as const;

// ---------------------------------------------------------------------------
// Page header: teal title left, outlined grey button right.
// ---------------------------------------------------------------------------
export function PageHeader({ title, action, subtitle }: { title: React.ReactNode; action?: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[20px] font-normal text-teal-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-9 px-4 text-sm' : 'h-8 px-3 text-xs',
        variant === 'primary' && 'bg-teal-900 text-white hover:bg-teal-700',
        variant === 'outline' && 'border border-[#c9d2d3] bg-white text-[#5f6f72] hover:bg-page-bg',
        variant === 'ghost' && 'text-teal-900 hover:bg-teal-900/5',
        variant === 'danger' && 'border border-danger/40 bg-white text-danger hover:bg-danger/5',
        className,
      )}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------
// Small badges
// ---------------------------------------------------------------------------
export function AiBadge({ source }: { source?: 'live' | 'cached' }) {
  if (!source) return null;
  return (
    <span
      title={source === 'live' ? 'Answer came from the live model' : 'Answer came from a saved fixture (no live model call)'}
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded bg-[#eceff0] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6b7b7e]"
    >
      AI: {source}
    </span>
  );
}

export function ConfidencePill({ confidence, n, source }: { confidence: 'high' | 'medium' | 'low' | 'none'; n: number; source: string }) {
  const label = confidence === 'none' ? 'Not enough history' : `${confidence[0].toUpperCase()}${confidence.slice(1)}`;
  const tone = confidence === 'high' ? 'teal' : confidence === 'medium' ? 'mint' : confidence === 'low' ? 'lime' : 'grey';
  const tail = source === 'own' ? ` · ${n} contracts` : source === 'pooled' ? ' · pooled data' : source === 'assumption' ? ' · assumption' : '';
  return <StatusPill tone={tone}>{label}{confidence === 'none' ? '' : tail}</StatusPill>;
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] leading-snug text-muted', className)}>
      Concept prototype for a case submission. Not affiliated with or endorsed by Sirion. All suppliers, people and numbers are fictional.
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <div className="text-sm font-medium text-ink">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
