"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BottomNav from "@/components/ui/BottomNav";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-[color:var(--canvas)] pb-28">

      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-semibold text-[color:var(--ink)]">Settings</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">Customise your TruLabel experience</p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-6 space-y-6">

        {/* Appearance */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Appearance
          </h2>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--ink)]">Theme</p>
                <p className="text-xs text-[color:var(--muted)]">Light or dark appearance</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Account
          </h2>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden divide-y divide-[color:var(--border)]">
            {user ? (
              <>
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">Signed in as</p>
                    <p className="text-xs text-[color:var(--muted)]">{user.email}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {user.display_name}
                  </span>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center justify-between px-4 py-4 hover:bg-[color:var(--card-muted)] transition"
                >
                  <p className="text-sm font-semibold text-[color:var(--ink)]">View Profile & Saved Products</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center justify-between px-4 py-4 hover:bg-[color:var(--card-muted)] transition"
                >
                  <p className="text-sm font-semibold text-[color:var(--ink)]">Sign In</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-between px-4 py-4 hover:bg-[color:var(--card-muted)] transition"
                >
                  <p className="text-sm font-semibold text-[color:var(--ink)]">Create Account</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--muted)]">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </section>

        {/* About */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            About
          </h2>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden divide-y divide-[color:var(--border)]">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Version</p>
              <p className="text-sm text-[color:var(--muted)]">1.0.0 (Capstone Build)</p>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Team</p>
              <p className="text-sm text-[color:var(--muted)]">Group 8 — PRJ566</p>
            </div>
          </div>
        </section>

      </div>

      <BottomNav />
    </main>
  );
}