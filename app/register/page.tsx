'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<{ username: string; status: 'idle' | 'available' | 'taken' }>({
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

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username?username=${encodeURIComponent(trimmedUsername)}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        setAvailability({
          username: trimmedUsername,
          status: data.available ? 'available' : 'taken',
        });
      } catch {
        setAvailability({
          username: trimmedUsername,
          status: 'idle',
        });
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [availability.username, trimmedUsername, usernameStatus]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);

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

      if (res.ok) {
        router.replace('/dashboard');
      } else {
        setError(data.error || 'Registration failed');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,174,97,0.15),transparent_36%),radial-gradient(circle_at_88%_14%,rgba(102,153,255,0.2),transparent_34%),linear-gradient(180deg,#06070a_0%,#0a0d15_100%)]" />

      <Link href="/" className="absolute top-6 left-6 text-neutral-300 hover:text-white inline-flex items-center gap-2 z-20">
        <ArrowLeft size={18} /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-6 sm:p-8 backdrop-blur-2xl relative z-10 shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
      >
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-300 mb-4">
          <Sparkles size={14} className="text-[#ffd27f]" /> New Account
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Create profile</h1>
        <p className="text-neutral-300 mt-2 mb-7">Claim your username and publish your custom page.</p>

        {error && <div className="bg-red-500/10 border border-red-500/25 text-red-300 p-3.5 rounded-xl mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" icon={<Mail size={15} />}>
            <input required name="email" type="email" className="w-full bg-transparent text-white placeholder:text-neutral-500 focus:outline-none" placeholder="you@example.com" />
          </Field>

          <Field label="Username" icon={<User size={15} />}>
            <input
              required
              name="username"
              type="text"
              autoComplete="username"
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores, and dashes"
              className="w-full bg-transparent text-white placeholder:text-neutral-500 focus:outline-none"
              placeholder="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>

          <p className={`-mt-2 text-xs ${
            usernameStatus === 'available'
              ? 'text-emerald-300'
              : usernameStatus === 'taken' || usernameStatus === 'invalid'
                ? 'text-red-300'
                : 'text-neutral-500'
          }`}>
            {usernameStatus === 'checking' && 'Checking username...'}
            {usernameStatus === 'available' && 'Username is available'}
            {usernameStatus === 'taken' && 'Username is already taken'}
            {usernameStatus === 'invalid' && 'Use 3-32 letters, numbers, underscores or dashes'}
            {usernameStatus === 'idle' && 'Choose a unique username for your profile URL'}
          </p>

          <Field label="Password" icon={<Lock size={15} />}>
            <input required name="password" type={showPassword ? 'text' : 'password'} minLength={8} className="w-full bg-transparent text-white placeholder:text-neutral-500 focus:outline-none" placeholder="Password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-neutral-400 hover:text-white">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
            className="w-full bg-[#f6f8ff] text-black font-bold py-3.5 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Sign Up
          </button>
        </form>

        <p className="mt-7 text-center text-neutral-300 text-sm">
          Already have an account? <Link href="/login" className="text-white underline underline-offset-4">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-neutral-300 mb-1.5 inline-flex items-center gap-2">{icon} {label}</span>
      <div className="w-full bg-black/45 border border-white/15 rounded-xl px-3.5 py-3 flex items-center gap-2">{children}</div>
    </label>
  );
}
