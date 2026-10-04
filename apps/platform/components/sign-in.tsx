"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignIn() {
  const [username, setUsername] = useState('devansh');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/auth/session', { credentials: 'same-origin', signal: controller.signal })
      .then(response => {
        if (response.ok) {
          const next = new URLSearchParams(window.location.search).get('returnTo') ?? '/app/';
          window.location.replace(/^\/app(?:\/|\?|$)/.test(next) ? next : '/app/');
        }
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok) throw Error(typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Sign-in failed');
      const next = new URLSearchParams(window.location.search).get('returnTo') ?? '/app/';
      window.location.assign(/^\/app(?:\/|\?|$)/.test(next) ? next : '/app/');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in'); setBusy(false); }
  }
  return <main className="signin-layout">
    <Link href="/" className="brand"><img src="/assets/aurat-mark.webp" alt=""/>aurat.</Link>
    <section className="signin-card">
      <span className="signin-icon"><LockKeyhole size={24}/></span>
      <p className="page-overline">YOUR PRIVATE WORKSPACE</p>
      <h1>Welcome back.</h1><p>Sign in to your projects, connections and regression results.</p>
      <form onSubmit={submit}>
        <Label htmlFor="username">Username</Label><Input id="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={80}/>
        <Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256}/>
        {error && <p role="alert" className="form-error">{error}</p>}
        <Button type="submit" disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:<ArrowRight size={16}/>} {busy?'Signing in…':'Sign in'}</Button>
      </form>
      <small>Database and API credentials are managed on the server.</small>
    </section>
    <Link href="/app/?demo=1" className="text-link">Explore the example workspace <ArrowRight size={14}/></Link>
  </main>;
}
