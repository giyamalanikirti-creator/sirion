import { BookOpen, CheckSquare, Home, Inbox, LineChart, Scale, Store, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/store';

export interface NavItem { href: string; label: string; icon: LucideIcon }

const ALL: Record<string, NavItem> = {
  home: { href: '/', label: 'Dashboard', icon: Home },
  inbox: { href: '/redlines', label: 'Redline inbox', icon: Inbox },
  approvals: { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  legal: { href: '/legal', label: 'Legal queue', icon: Scale },
  portal: { href: '/portal/clouddesk', label: 'Supplier portal', icon: Store },
  insights: { href: '/insights', label: 'Insights', icon: LineChart },
  story: { href: '/story', label: 'Story', icon: BookOpen },
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  lead: [ALL.home, ALL.inbox, ALL.insights, ALL.story],
  owner: [ALL.approvals, ALL.story],
  finance: [ALL.approvals, ALL.insights, ALL.story],
  legal: [ALL.legal, ALL.story],
  supplier: [ALL.portal],
};

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}
