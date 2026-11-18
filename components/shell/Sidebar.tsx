'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Disclaimer } from '../ui';
import { Logo } from './Logo';
import { isActive, NAV_BY_ROLE } from './nav';

export function Sidebar() {
  const pathname = usePathname();
  const role = useDemo((s) => s.role);
  const items = NAV_BY_ROLE[role];

  return (
    <>
      {/* Desktop: fixed 64px rail that expands on hover to show labels + disclaimer */}
      <nav
        aria-label="Main"
        className="group/side fixed inset-y-0 left-0 z-40 hidden w-16 flex-col overflow-hidden bg-teal-900 transition-[width] duration-200 hover:w-56 focus-within:w-56 md:flex"
      >
        <Link href="/" className="flex h-16 shrink-0 items-center gap-3 px-3.5" aria-label="Cost of Yes home">
          <Logo className="h-9 w-9 shrink-0" />
          <span className="whitespace-nowrap text-sm font-medium text-white opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100">
            Cost of Yes
          </span>
        </Link>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((it) => {
            const active = isActive(pathname, it.href);
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  title={it.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-[52px] items-center gap-4 px-5 transition-colors',
                    active ? 'bg-white text-teal-900' : 'text-white hover:bg-teal-700',
                  )}
                >
                  <Icon className="h-6 w-6 shrink-0" strokeWidth={active ? 2.2 : 1.7} />
                  <span className="whitespace-nowrap text-sm opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100">
                    {it.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto w-56 p-4 opacity-0 transition-opacity group-hover/side:opacity-100 group-focus-within/side:opacity-100">
          <Disclaimer className="text-white/70" />
        </div>
      </nav>

      {/* Mobile: bottom bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around bg-teal-900 md:hidden">
        {items.map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              className={cn('flex flex-1 items-center justify-center', active ? 'bg-white text-teal-900' : 'text-white')}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
