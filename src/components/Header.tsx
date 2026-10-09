import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BarChart3, Briefcase, Menu, Plus, Settings, Trophy, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LoginArea } from '@/components/auth/LoginArea';
import { LogoMark } from '@/components/LogoMark';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isAdmin, APP_NAME } from '@/lib/market/constants';
import { useCanCreateMarket } from '@/hooks/useMarketCreators';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Markets', icon: BarChart3, end: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase, end: false },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );
}

export function Header() {
  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);
  const creator = useCanCreateMarket(user?.pubkey);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label={APP_NAME}>
          <LogoMark />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:block">
            Team Oracle
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
          {creator && (
            <NavLink to="/create" className={navLinkClass}>
              <Plus className="size-4" />
              New market
            </NavLink>
          )}
          {admin && (
            <NavLink to="/users" className={navLinkClass}>
              <Users className="size-4" />
              Users
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {admin && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="hidden rounded-full text-muted-foreground hover:text-foreground sm:inline-flex"
              aria-label="Settings"
            >
              <Link to="/settings">
                <Settings className="size-4.5" />
              </Link>
            </Button>
          )}
          <LoginArea className="max-w-52" />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-5">
              <SheetTitle className="flex items-center gap-2 font-display text-base font-bold">
                <LogoMark className="size-7" />
                Team Oracle
              </SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="size-4.5" />
                    {item.label}
                  </NavLink>
                ))}
                {creator && (
                  <NavLink
                    to="/create"
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Plus className="size-4.5" />
                    New market
                  </NavLink>
                )}
                {admin && (
                  <NavLink
                    to="/users"
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Users className="size-4.5" />
                    Users
                  </NavLink>
                )}
                {admin && (
                  <NavLink
                    to="/settings"
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    <Settings className="size-4.5" />
                    Settings
                  </NavLink>
                )}
              </nav>
              <div className="mt-6 border-t pt-4">
                <LoginArea className="w-full [&>button]:w-full" />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
