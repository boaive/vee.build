import { FileText, Gauge, Inbox, Settings, Tag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** The whole panel: five places, in the order the work goes. */
export const navItems: NavItem[] = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/prices', label: 'Prices', icon: Tag },
  { to: '/settings', label: 'Settings', icon: Settings },
];
