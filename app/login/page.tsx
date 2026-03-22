'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const identifierId = useId();
  const passwordId = useId();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(event.currentTarget);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifier: formData.get('identifier'),
          password: formData.get('password'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed');
        setLoading(false);
        return;
      }

      router.replace('/dashboard');
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 linksky-grid-lines opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(241,147,113,0.16),transparent_32%),radial-gradient(circle_at_86%_8%,rgba(125,192,255,0.18),transparent_34%),linear-gradient(180deg,rgba(9,12,17,0.98),rgba(11,15,22,1))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1120px] items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.02fr)_420px] lg:items-center">
          <section className="hidden lg:block">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:text-white">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mt-8 max-w-[560px]">
              <span className="linksky-kicker">Account access</span>
              <h1 className="mt-5 font-display text-6xl font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                Pick up where your page left off.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[color:var(--text-secondary)]">
                Sign in to update links, swap media, check clicks, or fine-tune the page before you share it again.
              </p>
            </div>
          </section>

          <section className="linksky-panel rounded-[32px] p-6 sm:p-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:text-white lg:hidden">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mt-4 lg:mt-0">
              <span className="linksky-kicker">Sign in</span>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                Use your email or username to get back into the studio.
              </p>
            </div>

            {error ? (
              <div className="mt-5 rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Email or username" icon={<Mail size={15} />} htmlFor={identifierId}>
                <input
                  id={identifierId}
                  required
                  name="identifier"
                  autoComplete="username"
                  placeholder="you@example.com"
                  className="linksky-input border-0 bg-transparent px-0 py-0 shadow-none focus:shadow-none"
                />
              </Field>

              <Field label="Password" icon={<Lock size={15} />} htmlFor={passwordId}>
                <input
                  id={passwordId}
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="linksky-input border-0 bg-transparent px-0 py-0 shadow-none focus:shadow-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-[color:var(--text-muted)] transition-colors hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="linksky-button-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm disabled:opacity-70"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                Enter studio
              </button>
            </form>

            <p className="mt-6 text-sm text-[color:var(--text-secondary)]">
              Need an account?{' '}
              <Link href="/register" className="font-medium text-white underline underline-offset-4">
                Create one
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  htmlFor,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
        {icon}
        {label}
      </label>
      <div className="rounded-[20px] border border-white/10 bg-[rgba(8,11,16,0.66)] px-4 py-3">
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </div>
  );
}
