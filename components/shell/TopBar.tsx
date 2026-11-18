'use client';

import Link from 'next/link';
import { Bell, HelpCircle, Search } from 'lucide-react';
import { useDemo, type Role } from '@/lib/store';
import { RoleSwitcher } from './RoleSwitcher';

const PERSON: Record<Role, { name: string; initials: string }> = {
  lead: { name: 'Riya Kapoor, Procurement lead', initials: 'RK' },
  owner: { name: 'Ananya Bose, Head of Support', initials: 'AB' },
  finance: { name: 'Dev Menon, Finance controller', initials: 'DM' },
  legal: { name: 'Ira Sethi, Legal counsel', initials: 'IS' },
  supplier: { name: 'CloudDesk account team', initials: 'CD' },
};

export function TopBar() {
  const role = useDemo((s) => s.role);
  const anyAwaiting = useDemo((s) => Object.values(s.negotiations).some((n) => n.status === 'awaiting_approval'));
  const pending = (role === 'owner' || role === 'finance') && anyAwaiting;
  const p = PERSON[role];
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-white px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden h-8 w-64 items-center gap-2 rounded-full bg-page-bg px-3 text-sm text-muted sm:flex">
          <Search className="h-4 w-4" />
          <span className="truncate">Search contracts, suppliers…</span>
        </div>
        <span className="text-sm font-medium text-teal-title sm:hidden">Cost of Yes</span>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <RoleSwitcher />
        <Link href="/approvals" aria-label={pending ? 'Notifications: approval waiting' : 'Notifications'} className="relative hidden rounded-full p-1.5 text-muted hover:bg-page-bg sm:block">
          <Bell className="h-5 w-5" strokeWidth={1.6} />
          {pending && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}
        </Link>
        <Link href="/story" aria-label="Help and story" className="hidden rounded-full p-1.5 text-muted hover:bg-page-bg sm:block">
          <HelpCircle className="h-5 w-5" strokeWidth={1.6} />
        </Link>
        <div title={p.name} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-900 text-sm text-white">
          {p.initials}
        </div>
      </div>
    </header>
  );
}
