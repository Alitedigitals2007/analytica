"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookIcon,
  DashboardIcon,
  FolderIcon,
  SearchIcon,
  SettingsIcon,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
  disabled?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/practice", label: "Practice", icon: BookIcon, disabled: true },
  { href: "/search", label: "Search", icon: SearchIcon, disabled: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-neutral-200 bg-white lg:flex">
        <Link
          href="/dashboard"
          className="flex h-14 items-center px-5 text-lg font-semibold tracking-tight text-neutral-900"
        >
          Analytica
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const cls = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              item.disabled
                ? "cursor-not-allowed text-neutral-400"
                : active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
            }`;
            if (item.disabled) {
              return (
                <span key={item.href} className={cls} aria-disabled>
                  <Icon width={18} height={18} />
                  {item.label}
                </span>
              );
            }
            return (
              <Link key={item.href} href={item.href} className={cls}>
                <Icon width={18} height={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500">
          v0.1 · Phase 1
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
        <Link href="/dashboard" className="text-lg font-semibold text-neutral-900">
          Analytica
        </Link>
        <Link
          href="/settings"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
        >
          Settings
        </Link>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.disabled ? "#" : item.href}
                aria-disabled={item.disabled}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] ${
                  item.disabled
                    ? "text-neutral-300"
                    : active
                      ? "font-medium text-neutral-900"
                      : "text-neutral-500"
                }`}
              >
                <Icon width={20} height={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
