import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@notify/ui/lib/utils";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const NAV_LINKS = [
  { to: "/events" as const, label: "Events" },
  { to: "/destinations" as const, label: "Destinations" },
] as const;

function MainNavLink({ to, label }: { to: string; label: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors motion-safe:duration-150 sm:min-h-9 sm:min-w-9 sm:px-3 sm:py-1.5",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  return (
    <header className="bg-background border-border border-b">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-5 md:px-6 lg:px-8">
        <nav className="flex min-w-0 items-center gap-0.5" aria-label="Main">
          {NAV_LINKS.map(({ to, label }) => (
            <MainNavLink key={to} to={to} label={label} />
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
