'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ABOUT, isActive, NAV_BY_ROLE, type NavItem } from './nav';

function NavLink({ it, pathname }: { it: NavItem; pathname: string }) {
  const active = isActive(pathname, it.href);
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      title={it.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-10 items-center gap-3 rounded-md px-3 text-[14px] transition-colors',
        active ? 'bg-teal-tint font-semibold text-teal-900' : 'text-muted hover:bg-page-bg hover:text-ink',
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-teal-900" aria-hidden />}
      <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} />
      <span className="hidden lg:inline">{it.label}</span>
    </Link>
  );
}

/** Labelled navigation on desktop, an icon rail on tablets, a bottom bar on phones. */
export function Sidebar() {
  const pathname = usePathname();
  const role = useDemo((s) => s.role);
  const items = NAV_BY_ROLE[role];

  return (
    <>
      <nav
        aria-label="Main"
        className="sticky top-14 hidden h-[calc(100vh-56px)] w-16 shrink-0 flex-col border-r border-line bg-white px-2 py-4 md:flex lg:w-56 lg:px-3"
      >
        <div className="space-y-1">{items.map((it) => <NavLink key={it.href} it={it} pathname={pathname} />)}</div>
        <div className="mt-auto space-y-3 border-t border-line pt-3">
          <NavLink it={ABOUT} pathname={pathname} />
          <p className="hidden px-3 text-[11px] leading-snug text-muted lg:block">Concept prototype. Not affiliated with Sirion. All data is fictional.</p>
        </div>
      </nav>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around border-t border-line bg-white md:hidden">
        {[...items, ABOUT].map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'text-teal-900' : 'text-muted')}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              {it.label.split(' ')[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
