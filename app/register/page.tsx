'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const emailId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const usernameHintId = useId();
  const usernameCacheRef = useRef(new Map<string, 'available' | 'taken'>());
  const [availability, setAvailability] = useState<{
    username: string;
    status: 'idle' | 'available' | 'taken';
  }>({
    username: '',
    status: 'idle',
  });

  const trimmedUsername = username.trim();
  const usernameStatus =
    !trimmedUsername
      ? 'idle'
      : !/^[a-zA-Z0-9_-]{3,32}$/.test(trimmedUsername)
        ? 'invalid'
        : availability.username !== trimmedUsername
          ? 'checking'
          : availability.status;

  useEffect(() => {
    if (!trimmedUsername || usernameStatus === 'invalid' || availability.username === trimmedUsername) {
      return;
    }

    const cached = usernameCacheRef.current.get(trimmedUsername);
    if (cached) {
      setAvailability({
        username: trimmedUsername,
        status: cached,
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username?username=${encodeURIComponent(trimmedUsername)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('Username check failed');
        }
        const data = await res.json();
        const status = data.available ? 'available' : 'taken';
        usernameCacheRef.current.set(trimmedUsername, status);
        setAvailability({
          username: trimmedUsername,
          status,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setAvailability({ username: trimmedUsername, status: 'idle' });
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [availability.username, trimmedUsername, usernameStatus]);

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
          action: 'register',
          email: formData.get('email'),
          username: formData.get('username'),
          password: formData.get('password'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
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
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.02fr)_440px] lg:items-center">
          <section className="hidden lg:block">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:text-white">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mt-8 max-w-[580px]">
              <span className="linksky-kicker">Create your page</span>
              <h1 className="mt-5 font-display text-6xl font-semibold leading-[0.95] tracking-[-0.05em] text-white">
                Claim the name before the next bio refresh.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[color:var(--text-secondary)]">
                Set up your LinkSky account, lock in your username, and start building a page that feels owned instead of borrowed.
              </p>
            </div>
          </section>

          <section className="linksky-panel rounded-[32px] p-6 sm:p-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] transition-colors hover:text-white lg:hidden">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mt-4 lg:mt-0">
              <span className="linksky-kicker">Register</span>
              <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-white">
                Start with your handle
              </h2>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                Your username becomes the public URL, so choose the one you want people to remember.
              </p>
            </div>

            {error ? (
              <div className="mt-5 rounded-[20px] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field label="Email" icon={<Mail size={15} />} htmlFor={emailId}>
                <input
                  id={emailId}
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="linksky-input border-0 bg-transparent px-0 py-0 shadow-none focus:shadow-none"
                />
              </Field>

              <Field label="Username" icon={<User size={15} />} htmlFor={usernameId}>
                <input
                  id={usernameId}
                  required
                  name="username"
                  autoComplete="username"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, underscores, and dashes"
                  placeholder="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  aria-describedby={usernameHintId}
                  className="linksky-input border-0 bg-transparent px-0 py-0 shadow-none focus:shadow-none"
                />
              </Field>

              <p
                id={usernameHintId}
                className={`-mt-2 text-xs ${
                  usernameStatus === 'available'
                    ? 'text-emerald-300'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'text-red-300'
                      : 'text-[color:var(--text-muted)]'
                }`}
                aria-live="polite"
              >
                {usernameStatus === 'checking' && 'Checking username...'}
                {usernameStatus === 'available' && 'Username is available'}
                {usernameStatus === 'taken' && 'That username is already in use'}
                {usernameStatus === 'invalid' && 'Use 3-32 letters, numbers, underscores, or dashes'}
                {usernameStatus === 'idle' && 'This becomes your public LinkSky URL'}
              </p>

              <Field label="Password" icon={<Lock size={15} />} htmlFor={passwordId}>
                <input
                  id={passwordId}
                  required
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
                disabled={
                  loading ||
                  usernameStatus === 'checking' ||
                  usernameStatus === 'taken' ||
                  usernameStatus === 'invalid'
                }
                className="linksky-button-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 text-sm disabled:opacity-70"
              >
                {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                Create account
              </button>
            </form>

            <p className="mt-6 text-sm text-[color:var(--text-secondary)]">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-white underline underline-offset-4">
                Sign in
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
