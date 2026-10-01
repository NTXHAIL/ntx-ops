"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  CloudLightning,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, PRODUCT_NAME } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { cn } from "cn";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/claims", label: "Claims", icon: ClipboardList },
  { href: "/estimates", label: "Estimates", icon: FileText },
  { href: "/storms", label: "Storms", icon: CloudLightning },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings, admin: true },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const estimateStudio =
    pathname === "/estimates/new" || /\/estimates\/[^/]+\/edit$/.test(pathname);

  return (
    <div className="min-h-dvh overflow-x-clip bg-[var(--app-canvas)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[var(--nav)] text-[var(--nav-foreground)] print:hidden lg:flex">
        <Brand />
        <Nav user={user} className="flex-1 px-3 py-4" />
        <UserCard user={user} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col bg-[var(--nav)] text-[var(--nav-foreground)]">
            <button
              type="button"
              className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-md text-white/70 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            <Brand />
            <Nav user={user} className="flex-1 px-3 py-4" onNavigate={() => setOpen(false)} />
            <UserCard user={user} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header
          className={cn(
            "sticky top-0 z-10 flex items-center gap-3 border-b border-border/80 bg-[var(--app-canvas)]/90 px-4 py-3 backdrop-blur print:hidden lg:hidden",
            estimateStudio && "hidden",
          )}
        >
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div>
            <p className="text-sm font-semibold tracking-tight">{PRODUCT_NAME}</p>
            <p className="text-xs text-muted-foreground">{BRAND_NAME}</p>
          </div>
        </header>
        <main
          className={cn(
            "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8",
            estimateStudio && "max-w-none px-0 py-0 sm:px-0 lg:px-0",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="border-b border-white/10 px-5 py-5">
      <p className="text-xs font-medium tracking-[0.18em] text-white/55 uppercase">
        {BRAND_NAME}
      </p>
      <p className="mt-1 text-lg font-black tracking-[0.12em]">HAILSPEC</p>
      <p className="text-[10px] font-bold tracking-wider text-blue-300 uppercase">
        {PRODUCT_NAME} · {BRAND_NAME}
      </p>
    </div>
  );
}

function Nav({
  user,
  className,
  onNavigate,
}: {
  user: SessionUser;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      <ul className="space-y-1">
        {links
          .filter((link) => !link.admin || user.role === "ADMIN")
          .map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/12 text-white"
                      : "text-white/70 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}

function UserCard({ user }: { user: SessionUser }) {
  return (
    <div className="mt-auto border-t border-white/10 px-4 py-4">
      <p className="truncate text-sm font-medium">{user.name}</p>
      <p className="truncate text-xs text-white/55">
        {user.role === "ADMIN" ? "Admin" : "Estimator"} · {user.email}
      </p>
      <form action={logoutAction} className="mt-3">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
