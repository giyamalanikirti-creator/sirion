'use client';

import { WORKSPACE } from '@/lib/account';
import { AccountMenu, HelpMenu, NotificationsMenu, ProductMark, SearchBox } from './HeaderControls';
import { RoleSwitcher } from './RoleSwitcher';

/** Compact application header: product, workspace, search, demo role, notifications, help, account. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-white px-4 md:px-6">
      <ProductMark />
      <span className="hidden h-6 w-px bg-line lg:block" aria-hidden />
      <span className="hidden whitespace-nowrap text-[13px] text-muted lg:block">{WORKSPACE.name} · {WORKSPACE.team}</span>
      <div className="ml-2 hidden flex-1 justify-center md:flex">
        <SearchBox />
      </div>
      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <RoleSwitcher />
        <NotificationsMenu />
        <HelpMenu />
        <AccountMenu />
      </div>
    </header>
  );
}
