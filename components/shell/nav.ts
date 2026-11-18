import { BookOpen, CheckSquare, FileText, LayoutDashboard, LineChart, Scale, Store, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/store';

export interface NavItem { href: string; label: string; icon: LucideIcon }

const ALL: Record<string, NavItem> = {
  overview: { href: '/', label: 'Overview', icon: LayoutDashboard },
  negotiations: { href: '/redlines', label: 'Negotiations', icon: FileText },
  approvals: { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  legal: { href: '/legal', label: 'Legal queue', icon: Scale },
  portal: { href: '/portal', label: 'Supplier portal', icon: Store },
  insights: { href: '/insights', label: 'Insights', icon: LineChart },
};

/** Primary destinations per demo role. */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  lead: [ALL.overview, ALL.negotiations, ALL.insights],
  owner: [ALL.approvals],
  finance: [ALL.approvals, ALL.insights],
  legal: [ALL.legal],
  supplier: [ALL.portal],
};

/** Secondary destination, below the primary list. */
export const ABOUT: NavItem = { href: '/story', label: 'About this demo', icon: BookOpen };

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}
