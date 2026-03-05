"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!displayName || !email || !password || !confirm) {
      setError("Please fill in all fields."); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    if (password !== confirm) {
      setError("Passwords do not match."); return;
    }

    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), displayName.trim(), password);
      router.push("/scan");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[color:var(--canvas)] px-6 py-12">

      {/* Back button */}
      <div className="absolute top-6 left-6">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--card)] shadow-sm text-[color:var(--muted)] hover:text-[color:var(--ink)] transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_12px_28px_rgba(16,185,129,0.4)]">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 27c10-16 23-16 28-16-2 15-12 25-28 26-2-4-2-7 0-10z" />
              <path d="M16 32c4-7 12-13 22-16" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[color:var(--ink)]">Create account</h1>
          <p className="text-sm text-[color:var(--muted)]">Start shopping ethically today</p>
        </div>

        {/* Form */}
        <div className="space-y-4 rounded-3xl bg-[color:var(--card)] p-6 shadow-sm">

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--canvas)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--canvas)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--canvas)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--canvas)] px-4 py-3 text-sm text-[color:var(--ink)] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </div>

        <p className="text-center text-sm text-[color:var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>

      </div>
    </main>
  );
}