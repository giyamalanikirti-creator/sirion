'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, BookOpen, ChevronDown, Compass, Database, FileText, HelpCircle, LogOut, RotateCcw, Search, UserRound } from 'lucide-react';
import { initials, WORKSPACE } from '@/lib/account';
import { contracts, redlines } from '@/lib/data';
import { nextStep, type Turn } from '@/lib/nextStep';
import { type Role, STATUS_LABEL, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

const menuCls = 'z-50 min-w-[240px] rounded-lg border border-line bg-white p-1 shadow-[var(--shadow-float)]';
const itemCls =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-[14px] text-ink outline-none data-[highlighted]:bg-page-bg data-[disabled]:cursor-default data-[disabled]:text-muted';
const iconBtn = 'relative flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-page-bg hover:text-ink data-[state=open]:bg-page-bg';

// ---------------------------------------------------------------------------
// Search: suppliers with open negotiations, other contracts, and pages.
// ---------------------------------------------------------------------------
type Result = { key: string; label: string; meta: string; href?: string };

export function SearchBox() {
  const router = useRouter();
  const negotiations = useDemo((s) => s.negotiations);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, like most workspaces.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results: Result[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const withRedline = new Set(redlines.map((r) => r.contractId));
    const rl = redlines
      .filter((r) => `${r.supplier} ${r.contractId} ${r.supplierType}`.toLowerCase().includes(term))
      .map((r) => ({ key: r.id, label: r.supplier, meta: `Negotiation · ${STATUS_LABEL[negotiations[r.id]?.status ?? 'received']}`, href: `/redlines/${r.id}` }));
    const other = contracts
      .filter((c) => !withRedline.has(c.id) && `${c.supplier} ${c.id}`.toLowerCase().includes(term))
      .slice(0, 4)
      .map((c) => ({ key: c.id, label: c.supplier, meta: `${c.id} · no open negotiation` }));
    const pages = [
      { key: 'p-ins', label: 'Insights', meta: 'Page', href: '/insights' },
      { key: 'p-about', label: 'About this demo', meta: 'Page', href: '/story' },
      { key: 'p-prof', label: 'My profile', meta: 'Page', href: '/profile' },
      { key: 'p-data', label: 'Workspace data access', meta: 'Page', href: '/workspace' },
    ].filter((p) => p.label.toLowerCase().includes(term));
    return [...rl, ...other, ...pages].slice(0, 8);
  }, [q, negotiations]);

  const go = (r?: Result) => {
    if (!r?.href) return;
    router.push(r.href);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-[360px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && !!q}
        aria-controls="search-results"
        aria-activedescendant={open && results[active] ? `sr-${results[active].key}` : undefined}
        aria-label="Search suppliers, contracts and pages"
        placeholder="Search suppliers, contracts…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            go(results[active]);
          } else if (e.key === 'Escape') {
            setQ('');
            setOpen(false);
          }
        }}
        className="h-9 w-full rounded-md border border-line bg-page-bg pl-9 pr-10 text-[14px] text-ink placeholder:text-muted focus:border-teal-900 focus:bg-white focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[11px] text-muted sm:block">/</kbd>
      {open && q && (
        <ul id="search-results" role="listbox" className={cn(menuCls, 'absolute left-0 right-0 top-11')}>
          {results.length === 0 && <li className="px-3 py-2 text-[14px] text-muted">No matches for “{q}”</li>}
          {results.map((r, i) => (
            <li
              key={r.key}
              id={`sr-${r.key}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={!r.href}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex items-center justify-between gap-3 rounded-md px-3 py-2 text-[14px]', i === active && 'bg-page-bg', r.href ? 'cursor-pointer text-ink' : 'cursor-default text-muted')}
            >
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 text-[12px] text-muted">{r.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications: what is waiting on whoever you are viewing as.
// ---------------------------------------------------------------------------
const TURN_FOR_ROLE: Record<Role, Turn[]> = { lead: ['you', 'sirion'], owner: ['owner'], finance: ['finance'], legal: ['legal'], supplier: ['supplier'] };

export function NotificationsMenu() {
  const router = useRouter();
  const role = useDemo((s) => s.role);
  const negotiations = useDemo((s) => s.negotiations);
  const items = redlines
    .map((r) => ({ r, step: nextStep(r.id, negotiations[r.id]) }))
    .filter(({ step }) => TURN_FOR_ROLE[role].includes(step.turn));
  const hrefFor = (id: string, slug: string) =>
    role === 'owner' || role === 'finance' ? '/approvals' : role === 'legal' ? '/legal' : role === 'supplier' ? `/portal/${slug}` : `/redlines/${id}`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={iconBtn} aria-label={`Notifications: ${items.length} waiting`}>
        <Bell className="h-[19px] w-[19px]" strokeWidth={1.8} />
        {items.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{items.length}</span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={cn(menuCls, 'w-[340px]')}>
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-[12px] font-medium text-muted">Waiting on you</DropdownMenu.Label>
          {items.length === 0 && <div className="px-3 py-3 text-[14px] text-muted">You’re all caught up.</div>}
          {items.map(({ r, step }) => (
            <DropdownMenu.Item key={r.id} className={cn(itemCls, 'items-start')} onSelect={() => router.push(hrefFor(r.id, r.slug))}>
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0">
                <span className="block font-medium">{r.supplier}</span>
                <span className="block text-[13px] text-muted">{step.title}</span>
              </span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Help: the walkthrough lives here, not on every screen.
// ---------------------------------------------------------------------------
export function HelpMenu() {
  const router = useRouter();
  const setGuideOpen = useDemo((s) => s.setGuideOpen);
  const reset = useDemo((s) => s.reset);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={iconBtn} aria-label="Help">
        <HelpCircle className="h-[19px] w-[19px]" strokeWidth={1.8} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuCls}>
          <DropdownMenu.Item className={itemCls} onSelect={() => setGuideOpen(true)}>
            <Compass className="h-4 w-4 text-muted" /> Walk me through the demo
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => router.push('/story')}>
            <BookOpen className="h-4 w-4 text-muted" /> About this demo
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            className={itemCls}
            onSelect={() => {
              reset();
              router.push('/');
            }}
          >
            <RotateCcw className="h-4 w-4 text-muted" /> Reset demo
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---------------------------------------------------------------------------
// Account: the signed-in user (Riya by default). Radix returns focus to the
// trigger on Escape / outside click.
// ---------------------------------------------------------------------------
export function AccountMenu() {
  const router = useRouter();
  const profile = useDemo((s) => s.profile);
  const signOut = useDemo((s) => s.signOut);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Open account menu"
        className="flex h-9 items-center gap-1.5 rounded-md pl-1 pr-1.5 hover:bg-page-bg data-[state=open]:bg-page-bg"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-[13px] font-semibold text-white" aria-hidden>
          {initials(profile.fullName)}
        </span>
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className={menuCls}>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-900 text-[14px] font-semibold text-white">{initials(profile.fullName)}</span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{profile.fullName}</span>
              <span className="block truncate text-[13px] text-muted">{profile.jobTitle}</span>
            </span>
          </div>
          <div className="px-3 pb-2 text-[12px] text-muted">{WORKSPACE.name} · {WORKSPACE.team}</div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={itemCls} onSelect={() => router.push('/profile')}>
            <UserRound className="h-4 w-4 text-muted" /> Edit my profile
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemCls} onSelect={() => router.push('/workspace')}>
            <Database className="h-4 w-4 text-muted" /> Workspace data access
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            className={itemCls}
            onSelect={() => {
              signOut();
              router.push('/');
            }}
          >
            <LogOut className="h-4 w-4 text-muted" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ProductMark() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Cost of Yes overview">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-900">
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden>
          <circle cx="20" cy="20" r="15" fill="none" stroke="white" strokeWidth="3" />
          <path d="M13.5 12.5 L20 20.5 L26.5 12.5 M20 20.5 V28.5" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="hidden text-[16px] font-semibold text-ink sm:inline">Cost of Yes</span>
    </Link>
  );
}
