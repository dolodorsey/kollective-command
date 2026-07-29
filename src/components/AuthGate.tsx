import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setChecking(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Access was not verified. Check your email and password.");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09090b] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-pulse rounded-full border border-[#c5a13d] bg-[#c5a13d]/10" />
          <p className="font-mono text-[10px] uppercase tracking-[.28em] text-white/45">Verifying command access</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative grid min-h-screen overflow-hidden bg-[#09090b] px-5 py-12 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(197,161,61,.16),transparent_34%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:auto,54px_54px,54px_54px]" />
        <section className="relative mx-auto grid w-full max-w-6xl items-stretch overflow-hidden rounded-3xl border border-white/10 bg-[#111114] shadow-2xl lg:grid-cols-[1.2fr_.8fr]">
          <div className="flex min-h-[520px] flex-col justify-between p-8 sm:p-12 lg:p-16">
            <header>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.28em] text-[#d6b95d]">The Kollective / Internal system</p>
              <h1 className="mt-8 max-w-[9ch] text-5xl font-bold leading-[.93] tracking-[-.06em] sm:text-7xl">Command belongs behind a verified door.</h1>
            </header>
            <div className="mt-16 grid gap-5 border-t border-white/10 pt-8 sm:grid-cols-2">
              <div>
                <ShieldCheck className="mb-4 h-5 w-5 text-[#d6b95d]" />
                <strong className="block text-sm">Authorized users only</strong>
                <span className="mt-2 block text-xs leading-6 text-white/45">Enterprise leads, communications, approvals, tasks, and operating records are not public content.</span>
              </div>
              <div>
                <LockKeyhole className="mb-4 h-5 w-5 text-[#d6b95d]" />
                <strong className="block text-sm">Session-controlled access</strong>
                <span className="mt-2 block text-xs leading-6 text-white/45">Use an existing approved Supabase account. Public signup is not available from this screen.</span>
              </div>
            </div>
          </div>
          <form onSubmit={signIn} className="flex flex-col justify-center border-t border-white/10 bg-white p-8 text-[#111114] sm:p-12 lg:border-l lg:border-t-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[.24em] text-[#9a771d]">Access control</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-.04em]">Sign in to Command</h2>
            <p className="mt-3 text-sm leading-6 text-black/55">Use the email and password already approved for the enterprise workspace.</p>
            <label className="mt-8 text-xs font-bold uppercase tracking-[.12em]">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 text-base font-normal normal-case tracking-normal outline-none focus:border-[#b38b28]"
              />
            </label>
            <label className="mt-5 text-xs font-bold uppercase tracking-[.12em]">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3 text-base font-normal tracking-normal outline-none focus:border-[#b38b28]"
              />
            </label>
            {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={busy} className="mt-7 rounded-xl bg-[#111114] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#29291f] disabled:opacity-50">
              {busy ? "Verifying…" : "Enter Command"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
