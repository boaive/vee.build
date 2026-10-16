import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePersistentState } from '@/lib/prefs';
import { navItems } from '@/lib/nav';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export function AppShell() {
  const [collapsed, setCollapsed] = usePersistentState<boolean>('sidebar-collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // A navigation closes the mobile drawer and puts focus at the top of the page.
  useEffect(() => {
    setMobileOpen(false);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  const current = navItems.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <TooltipProvider delayDuration={200}>
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <div className="flex min-h-dvh" style={{ ['--sidebar-w' as string]: collapsed ? '4.25rem' : '15.5rem' }}>
        <aside
          className="sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:block"
          style={{ width: collapsed ? '4.25rem' : '15.5rem' }}
          aria-label="Primary"
        >
          <Sidebar collapsed={collapsed} />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Sections of the admin panel</SheetDescription>
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}>
              {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </Button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <p className="eyebrow ml-2 hidden truncate sm:block">{current?.label ?? 'Admin'}</p>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] flex-1 px-3 py-6 outline-none sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
