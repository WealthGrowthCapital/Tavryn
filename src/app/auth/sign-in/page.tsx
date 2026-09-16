'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next')?.startsWith('/') ? searchParams.get('next')! : '/questions/ask';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Supabase is not configured for this environment.');
      setBusy(false);
      return;
    }
    const callback = new URL('/auth/callback', window.location.origin);
    callback.searchParams.set('next', next);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback.toString() },
    });
    setMessage(error ? error.message : 'Check your email for the sign-in link.');
    setBusy(false);
  }

  return (
    <main className="container py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-950">← Back to Tavryn</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-slate-600">Use your email to receive a secure one-click sign-in link.</p>
        <form onSubmit={submit} className="card mt-8 p-6">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500" placeholder="you@example.com" />
          <button disabled={busy} className="mt-4 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
          {message && <p className="mt-4 text-sm text-slate-600" role="status">{message}</p>}
        </form>
      </div>
    </main>
  );
}
