"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SettingsSheet from "@/components/ui/SettingsSheet";

const navItems = [
  {
    href: "/scan",
    label: "Home",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10l9-7 9 7" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: "/scan-history",
    label: "History",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v5h5" />
        <path d="M3.05 13a9 9 0 1 0 .5-4" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isHistory = pathname === "/scan-history";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--nav-border)] bg-[color:var(--nav-bg)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-3 items-center px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-center">
        {navItems.map((item) => {
          const isActive =
            item.href === "/scan-history" ? isHistory : !isHistory;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition ${
                isActive
                  ? "text-emerald-600"
                  : "text-[color:var(--muted)] hover:text-[color:var(--ink)]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        <SettingsSheet
          buttonClassName="flex flex-col items-center gap-1 text-[11px] font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
          iconClassName="h-7 w-7"
          showLabel
          label="Settings"
        />
      </div>
    </nav>
  );
}
