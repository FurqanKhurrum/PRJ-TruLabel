"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export default function BottomNav() {
  const pathname = usePathname();

  // Safe — returns null instead of throwing if AuthProvider isn't ready yet
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  const initials = user?.display_name
    ? user.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : null;

  const navItems = [
    {
      href:  "/scan",
      label: "Home",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10l9-7 9 7" />
          <path d="M9 22V12h6v10" />
        </svg>
      ),
    },
    {
      href:  "/scan-history",
      label: "History",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v5h5" />
          <path d="M3.05 13a9 9 0 1 0 .5-4" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      href:  "/settings",
      label: "Settings",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      href:  "/profile",
      label: user ? "Profile" : "Sign In",
      icon: initials ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
          {initials}
        </span>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--nav-border)] bg-[color:var(--nav-bg)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 items-center px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
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
      </div>
    </nav>
  );
}