'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError, apiRequest, setAccessToken } from '@/lib/api-client';
import { getSafeNextPath, type AuthSessionResponse } from '../auth-types';
import { AuthCard, AuthMessage } from './auth-shell';

const inputClass = 'field focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

function PasswordField({ name, label, autoComplete, value, onChange, minLength = 8 }: { name: string; label: string; autoComplete: string; value: string; onChange: (value: string) => void; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <label className="block text-xs font-medium" htmlFor={name}>{label}<span className="sr-only">, minimum {minLength} characters</span><div className="relative"><input id={name} required name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-10`} /><button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button></div></label>;
}

function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return <Button type="submit" className="mt-1 w-full" disabled={loading}>{loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{loading ? 'Please wait…' : children}</Button>;
}

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<AuthSessionResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!response.access_token) throw new Error('Your account needs email verification before you can sign in.');
      setAccessToken(response.access_token, rememberMe, response.refresh_token);
      router.replace(nextPath);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to sign in. Check your details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return <AuthCard title="Welcome back" description="Sign in to continue to your sources, conversations, and AI Studio tools.">
    <form className="space-y-4" onSubmit={submit}>
      {error && <AuthMessage>{error}</AuthMessage>}
      <label className="block text-xs font-medium" htmlFor="login-email">Email<input id="login-email" required name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <PasswordField name="login-password" label="Password" autoComplete="current-password" value={password} onChange={setPassword} minLength={6} />
      <div className="flex items-center justify-between gap-3 text-xs">
        <label className="inline-flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="size-3.5 accent-[var(--primary)]" /> Remember me</label>
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link>
      </div>
      <SubmitButton loading={loading}>Sign in</SubmitButton>
    </form>
    <p className="mt-6 text-center text-xs text-muted-foreground">New to 29 AI Workspace? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link></p>
  </AuthCard>;
}

export function RegisterPageContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    console.log("register submit");
    event.preventDefault();
    if (loading) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiRequest<AuthSessionResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      if (response.access_token) {
        setAccessToken(response.access_token, true, response.refresh_token);
        setSuccess('Account created successfully. Redirecting to your workspace.');
        window.setTimeout(() => {
          router.replace('/dashboard');
          router.refresh();
        }, 800);
      } else {
        setSuccess('Account created successfully. Check your email to verify your account.');
        window.setTimeout(() => router.replace('/verify-email'), 1200);
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) return <AuthCard title="Account created" description="Your account has been created successfully."><div className="grid gap-4"><AuthMessage tone="success">{success}</AuthMessage><Link href={success.includes('verify') ? '/verify-email' : '/dashboard'} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Continue</Link></div></AuthCard>;

  return <AuthCard title="Create your workspace" description="Bring your sources, research, and AI workflows together in one focused space.">
    <form className="space-y-4" onSubmit={submit}>
      {error && <AuthMessage>{error}</AuthMessage>}
      <label className="block text-xs font-medium" htmlFor="register-name">Full name<input id="register-name" required name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
      <label className="block text-xs font-medium" htmlFor="register-email">Email<input id="register-email" required name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <PasswordField name="register-password" label="Password" autoComplete="new-password" value={password} onChange={setPassword} />
      <PasswordField name="register-confirm-password" label="Confirm password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
      <p className="text-[11px] leading-5 text-muted-foreground">Use at least 8 characters. We’ll send a verification email before your first sign in.</p>
      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
    <p className="mt-6 text-center text-xs text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
  </AuthCard>;
}

export function ForgotPasswordPageContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to send a reset email right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) return <AuthCard title="Check your inbox" description="If an account exists for that email, we’ve sent a secure password reset link."><div className="grid justify-items-center gap-4 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><Mail aria-hidden="true" className="size-5" /></span><p className="text-sm leading-6 text-muted-foreground">The link expires for your protection. Check spam if you don’t see it shortly.</p><Link href="/login" className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Return to sign in</Link></div></AuthCard>;

  return <AuthCard title="Reset your password" description="Enter your email and we’ll send a secure link to help you get back into your workspace.">
    <form className="space-y-4" onSubmit={submit}>
      {error && <AuthMessage>{error}</AuthMessage>}
      <label className="block text-xs font-medium" htmlFor="forgot-email">Email<input id="forgot-email" required name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <SubmitButton loading={loading}>Send reset link</SubmitButton>
    </form>
    <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-3.5" /> Back to sign in</Link>
  </AuthCard>;
}

export function ResetPasswordPageContent() {
  const [tokens, setTokens] = useState<{ accessToken?: string; refreshToken?: string; code?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = query.get('access_token') ?? hash.get('access_token');
    const refreshToken = query.get('refresh_token') ?? hash.get('refresh_token');
    const code = query.get('code');
    if ((accessToken && refreshToken) || code) setTokens({ accessToken: accessToken ?? undefined, refreshToken: refreshToken ?? undefined, code: code ?? undefined });
    setReady(true);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!tokens) {
      setError('This reset link is missing or expired. Request a new one to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<AuthSessionResponse>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ password, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, code: tokens.code }) });
      if (response.access_token) setAccessToken(response.access_token, true, response.refresh_token);
      setSuccess(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to update your password. Request a new reset link and try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return <AuthCard title="Reset your password" description="Preparing your secure reset session…"><div className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />Checking reset link</div></AuthCard>;
  if (success) return <AuthCard title="Password updated" description="Your password has been changed and your workspace session is ready."><div className="grid gap-4"><AuthMessage tone="success">Password updated successfully.</AuthMessage><Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Continue to workspace</Link></div></AuthCard>;

  return <AuthCard title="Choose a new password" description="Use a strong password you haven’t used elsewhere.">
    <form className="space-y-4" onSubmit={submit}>
      {error && <AuthMessage>{error}</AuthMessage>}
      {!tokens && <AuthMessage>The reset link is missing or expired. You can request a new one below.</AuthMessage>}
      <PasswordField name="reset-password" label="New password" autoComplete="new-password" value={password} onChange={setPassword} />
      <PasswordField name="reset-confirm-password" label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
      <SubmitButton loading={loading}>Update password</SubmitButton>
    </form>
    <p className="mt-6 text-center text-xs text-muted-foreground"><Link href="/forgot-password" className="font-semibold text-primary hover:underline">Request a new reset link</Link></p>
  </AuthCard>;
}

export function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const attempted = useRef(false);
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (values: { email?: string; token?: string; tokenHash?: string; code?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<AuthSessionResponse>('/auth/verify-email', { method: 'POST', body: JSON.stringify(values) });
      if (response.access_token) setAccessToken(response.access_token, true, response.refresh_token);
      setSuccess(true);
      if (response.access_token) window.setTimeout(() => router.replace('/dashboard'), 700);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to verify your email. Request a fresh verification email and try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attempted.current) return;
    const tokenHash = searchParams.get('token_hash');
    const code = searchParams.get('code');
    const queryToken = searchParams.get('token');
    if (!tokenHash && !code && !queryToken) return;
    attempted.current = true;
    void verify({ email: searchParams.get('email') ?? undefined, token: queryToken ?? undefined, tokenHash: tokenHash ?? undefined, code: code ?? undefined });
    // The verification URL is intentionally read once; changing it should start a fresh page flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (success) return <AuthCard title="Email verified" description="Your account is ready. You can now continue to your workspace."><div className="grid justify-items-center gap-4 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="size-6" /></span><AuthMessage tone="success">Email verified successfully.</AuthMessage><Link href="/dashboard" className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Continue to workspace</Link></div></AuthCard>;

  return <AuthCard title="Verify your email" description="Enter the verification code from your email to activate your 29 AI Workspace account.">
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void verify({ email, token }); }}>
      {error && <AuthMessage>{error}</AuthMessage>}
      {loading && <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />Verifying your email…</p>}
      <label className="block text-xs font-medium" htmlFor="verify-email">Email<input id="verify-email" required name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <label className="block text-xs font-medium" htmlFor="verify-token">Verification code<input id="verify-token" required name="token" inputMode="numeric" autoComplete="one-time-code" value={token} onChange={(event) => setToken(event.target.value)} className={inputClass} /></label>
      <Button type="submit" className="mt-1 w-full" disabled={loading}>{loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}Verify email</Button>
    </form>
    <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"><ShieldCheck aria-hidden="true" className="size-3.5" /> Use the latest code from your inbox.</p>
  </AuthCard>;
}
