"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid username or password.");
      } else {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111d26] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Image src="/Logo.png" alt="Groupe Piche" width={160} height={80} className="h-20 w-40 object-contain" priority />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h1 className="mb-1 text-2xl font-black text-white">Welcome back</h1>
          <p className="mb-8 text-sm text-slate-400">Sign in to your Piche account</p>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 outline-none ring-piche-gold transition focus:border-piche-gold focus:ring-1"
                placeholder="your-username"
                required
                disabled={isPending}
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white placeholder-slate-500 outline-none ring-piche-gold transition focus:border-piche-gold focus:ring-1"
                placeholder="••••••••"
                required
                disabled={isPending}
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 flex min-h-12 items-center justify-center rounded-lg bg-piche-gold font-black text-piche-navy transition hover:brightness-110 disabled:opacity-60"
            >
              {isPending ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Piche Labour Curve Management · Groupe Piche
        </p>
      </div>
    </div>
  );
}
