import { ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router';
import { useEnquiryCounts } from '@/api/hooks';
import { Brand } from '@/components/Brand';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { navItems } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const fresh = useEnquiryCounts().data?.byStatus.new ?? 0;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Brand compact={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Sections">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const badge = item.to === '/enquiries' && fresh > 0 ? fresh : null;
            const link = (
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    collapsed && 'justify-center px-0',
                    isActive && 'bg-accent text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-signal',
                  )
                }
              >
                <item.icon className="size-[1.1rem] shrink-0" aria-hidden />
                {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                {badge !== null && (
                  <span className={cn('data rounded-full bg-signal px-1.5 text-[0.65rem] leading-4 text-signal-foreground', collapsed ? 'absolute right-1 top-1' : 'ml-auto')} aria-label={`${badge} new`}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
            return (
              <li key={item.to}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className={cn('flex items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground hover:text-foreground', collapsed && 'justify-center px-0')}
      >
        <ExternalLink className="size-3.5" aria-hidden />
        {collapsed ? <span className="sr-only">Open the website</span> : 'Open the website'}
      </a>
    </div>
  );
}
