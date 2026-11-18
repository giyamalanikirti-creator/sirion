'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ROLE_HOME, ROLE_LABEL, type Role, useDemo } from '@/lib/store';
import { cn } from '@/lib/utils';

const ROLES: Role[] = ['lead', 'owner', 'finance', 'legal', 'supplier'];

export function useSwitchRole() {
  const router = useRouter();
  const setRole = useDemo((s) => s.setRole);
  return (r: Role, href?: string) => {
    setRole(r);
    router.push(href ?? ROLE_HOME[r]);
  };
}

export function RoleSwitcher({ compact }: { compact?: boolean }) {
  const role = useDemo((s) => s.role);
  const switchRole = useSwitchRole();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'mr-1 inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[13px] text-ink hover:bg-page-bg data-[state=open]:bg-page-bg',
        )}
        aria-label="Switch role"
      >
        {!compact && <span className="hidden text-muted xl:inline">Demo · viewing as</span>}
        <span className="font-medium">{ROLE_LABEL[role]}</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[220px] rounded-lg border border-line bg-white p-1 shadow-[var(--shadow-float)]">
          <DropdownMenu.Label className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted">Demo role</DropdownMenu.Label>
          {ROLES.map((r) => (
            <DropdownMenu.Item
              key={r}
              onSelect={() => switchRole(r)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-page-bg"
            >
              {ROLE_LABEL[r]}
              {r === role && <Check className="h-4 w-4 text-teal-900" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
