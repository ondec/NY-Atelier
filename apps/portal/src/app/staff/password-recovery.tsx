"use client";

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, LockKeyhole} from '@/components/icons';
import {readStaffResetLink} from '@/lib/staff-password-reset';
import {signalStaffSessionChange} from '@/lib/staff-session-change';
import './password-recovery.css';
import PasswordInput from "../password-input";

export default function StaffPasswordRecovery({mode, destination}: {mode: 'forgot' | 'reset'; destination: 'office' | 'studio'}) {
  const [link, setLink] = useState<ReturnType<typeof readStaffResetLink>>();
  const [checked, setChecked] = useState(mode === 'forgot');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const linkRead = useRef(false);
  useEffect(() => {
    if (mode !== 'reset' || linkRead.current) return;
    linkRead.current = true;
    const value = readStaffResetLink(location.hash);
    // Remove the secret from the address bar/history; it is only sent in the reset POST body.
    history.replaceState(history.state, '', location.pathname + location.search);
    queueMicrotask(() => {setLink(value); setChecked(true);});
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (mode === 'reset' && form.get('password') !== form.get('password_confirmation')) {setError('The passwords do not match.'); return;}
    setBusy(true); setError(''); setMessage('');
    try {
      const body = mode === 'forgot' ? {email: form.get('email'), next: destination} : {...link, password: form.get('password'), password_confirmation: form.get('password_confirmation')};
      const response = await fetch(`/api/staff-auth/${mode === 'forgot' ? 'forgot-password' : 'reset-password'}`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : data.message ?? 'Could not reset your password.');
      setMessage(data.message);
      if (mode === 'reset') {setComplete(true); setLink(undefined); signalStaffSessionChange();}
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Password reset is temporarily unavailable. Please try again.');
    } finally {setBusy(false);}
  }

  return <main className="staff-sign-in staff-recovery"><section className="staff-sign-in-card">
    <div className="staff-sign-in-brand"><Image src="/ny-mark.svg" alt="" width={52} height={52}/><span>NY ATELIER<small>STAFF ACCESS</small></span></div>
    <p className="eyebrow">NY TEAM</p>
    <h1>{complete ? 'You’re all set.' : mode === 'forgot' ? 'Forgot password?' : 'A fresh start.'}</h1>
    {mode === 'forgot' ? <p>Enter your staff email and we’ll send you a link to choose a new password.</p> : !complete && <p>Choose a new password for your NY Atelier staff account.</p>}
    {message && <p className="staff-recovery-status" role="status">{message}</p>}
    {!complete && (mode === 'forgot' || link) && <form method="post" onSubmit={submit}>
      {mode === 'forgot' ? <label>Staff email<input name="email" type="email" autoComplete="username" maxLength={255} required disabled={busy}/></label> : <>
        <p>{link?.email}</p>
        <label>New password<PasswordInput name="password" autoComplete="new-password" minLength={12} maxLength={255} required disabled={busy} aria-describedby="staff-password-guidance"/></label>
        <p id="staff-password-guidance">Use at least 12 characters, including letters and numbers.</p>
        <label>Confirm new password<PasswordInput name="password_confirmation" autoComplete="new-password" minLength={12} maxLength={255} required disabled={busy}/></label>
      </>}
      {error && <p role="alert" className="collection-error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? (mode === 'forgot' ? 'Sending…' : 'Resetting…') : mode === 'forgot' ? (message ? 'Send another link' : 'Send reset link') : 'Reset password'}<ArrowRight size={18}/></button>
    </form>}
    {mode === 'reset' && !checked && <p role="status">Opening your reset link…</p>}
    {mode === 'reset' && checked && !link && !complete && <p role="alert">This link is incomplete or has already been opened here. Request a new reset link.</p>}
    {mode === 'reset' && checked && !complete && <Link prefetch={false} className="staff-recovery-link" href={`/staff/forgot-password?next=${destination}`}>Request a new link</Link>}
    <Link prefetch={false} className="staff-recovery-link staff-recovery-back" href={`/staff/sign-in?next=${destination}`}><ArrowLeft size={18}/>Back to sign in</Link>
    <p className="staff-sign-in-help"><LockKeyhole size={15}/>{mode === 'forgot' ? 'Reset links expire after one hour. If you need an account or an invitation, contact your administrator.' : 'After resetting, use your new password to sign in again on each device.'}</p>
  </section></main>;
}
