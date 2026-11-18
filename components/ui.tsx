import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Panel: one white working surface, 8px corners, 1px border, dividers inside.
// (Kept the SirionCard name so existing screens keep working.)
// ---------------------------------------------------------------------------
export function SirionCard({
  title, subtitle, action, children, className, bodyClassName, id, as: Tag = 'section',
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Kept for compatibility; panels no longer show a decorative kebab menu. */
  menu?: boolean;
  id?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag id={id} className={cn('rounded-lg border border-line bg-card', className)}>
      {title !== undefined && (
        <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold leading-snug text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Tag>
  );
}
export const Panel = SirionCard;

// ---------------------------------------------------------------------------
// KPI tile: compact label, large tabular numeral, short caption.
// ---------------------------------------------------------------------------
export function KpiTile({
  label, value, caption, small, className, tone = 'ink',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  caption?: React.ReactNode;
  small?: boolean;
  className?: string;
  tone?: 'ink' | 'teal' | 'positive' | 'danger';
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[13px] text-muted">{label}</div>
      <div
        className={cn(
          'num mt-1 font-semibold leading-tight tracking-tight',
          small ? 'text-[22px]' : 'text-[26px]',
          tone === 'teal' && 'text-teal-900',
          tone === 'positive' && 'text-positive',
          tone === 'danger' && 'text-danger',
          tone === 'ink' && 'text-ink',
        )}
      >
        {value}
      </div>
      {caption && <div className="mt-1 text-[12px] leading-snug text-muted">{caption}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips and status pills (status colour always paired with text).
// ---------------------------------------------------------------------------
export function Chip({
  children, icon, className, tone = 'default', title,
}: { children: React.ReactNode; icon?: React.ReactNode; className?: string; tone?: 'default' | 'teal' | 'muted'; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]',
        tone === 'teal' && 'border-teal-900/30 bg-teal-tint text-teal-900',
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
  teal: 'bg-teal-tint text-teal-900',
  mint: 'bg-positive-bg text-positive',
  positive: 'bg-positive-bg text-positive',
  current: 'bg-agreement-bg text-agreement',
  proposed: 'bg-proposed-bg text-proposed',
  periwinkle: 'bg-proposed-bg text-proposed',
  lime: 'bg-proposed-bg text-proposed',
  grey: 'bg-page-bg text-muted border border-line',
  danger: 'bg-danger/10 text-danger',
  indigo: 'bg-agreement-bg text-agreement',
} as const;

export function StatusPill({
  children, tone = 'teal', className, dot,
}: { children: React.ReactNode; tone?: keyof typeof PILL_TONES; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium', PILL_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const GROUP_TONE = { harmless: 'grey', legal: 'current', money: 'proposed' } as const;

// ---------------------------------------------------------------------------
// Page header: 28px/600 title on the shared content edge.
// ---------------------------------------------------------------------------
export function PageHeader({ title, action, subtitle, eyebrow }: { title: React.ReactNode; action?: React.ReactNode; subtitle?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons: one filled primary per decision area; outline / ghost otherwise.
// ---------------------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'lg' && 'h-11 px-5 text-[15px]',
        size === 'md' && 'h-9 px-4 text-[14px]',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        variant === 'primary' && 'bg-teal-900 text-white hover:bg-teal-700 active:bg-[#003a41]',
        variant === 'outline' && 'border border-line bg-white text-ink hover:border-[#b9c7d0] hover:bg-page-bg active:bg-[#e9eef3]',
        variant === 'ghost' && 'text-teal-900 hover:bg-teal-tint active:bg-[#d3e8ea]',
        variant === 'danger' && 'border border-danger/40 bg-white text-danger hover:bg-danger/5',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
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
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded border border-line bg-page-bg px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted"
    >
      AI: {source}
    </span>
  );
}

export function ConfidencePill({ confidence, n, source }: { confidence: 'high' | 'medium' | 'low' | 'none'; n: number; source: string }) {
  const label = confidence === 'none' ? 'Insufficient internal history' : `${confidence[0].toUpperCase()}${confidence.slice(1)} confidence`;
  const tone = confidence === 'high' ? 'positive' : confidence === 'medium' ? 'current' : confidence === 'low' ? 'proposed' : 'grey';
  const tail = source === 'own' ? ` · ${n} contracts` : source === 'pooled' ? ' · peer data' : source === 'assumption' ? ' · assumption' : '';
  return <StatusPill tone={tone}>{label}{confidence === 'none' ? '' : tail}</StatusPill>;
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-[12px] leading-snug text-muted', className)}>
      Concept prototype for a case submission. Not affiliated with or endorsed by Sirion. All suppliers, people and numbers are fictional.
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center">
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {children && <div className="mt-1 max-w-md text-[14px] text-muted">{children}</div>}
    </div>
  );
}

/** "Fictional demo data" label. */
export function DemoLabel({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded border border-line bg-page-bg px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted', className)}>
      Fictional demo data
    </span>
  );
}
