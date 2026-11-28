import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check } from './NyIcons.jsx';

const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const day = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

async function call(id, action, body) {
  const response = await fetch(`${base}/api/consultations/${encodeURIComponent(id)}/${action}`, {
    method: 'POST', cache: 'no-store', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409) throw new Error('This appointment has already changed. Reload the page.');
  if (response.status === 429) throw new Error('Too many tries. Please wait a minute and try again.');
  if (!response.ok) throw new Error(Object.values(result.errors ?? {})[0]?.[0] ?? result.message ?? 'Something went wrong. Please try again.');
  return result;
}

/** /appointment/reply?id=…&token=… — opened from the appointment email. No sign-in needed. */
export default function AppointmentReply() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const token = params.get('token') ?? '';
  const [row, setRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Your appointment · NY Atelier';
    call(id, 'view', { token }).then(setRow).catch(failure => setError(failure.message));
  }, [id, token]);

  async function reply(body) {
    setBusy(true); setError('');
    try { setRow(await call(id, 'reply', { token, version: row.version, ...body })); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }

  return <main id="main" className="acct acct-signin container">
    <section className="cx-form acct-card">
      <p className="eyebrow">YOUR APPOINTMENT</p>
      {!row ? (error ? <><h1>Link not <em>valid.</em></h1><p className="field-error" role="alert">{error}</p><Link className="text-link" to="/contact">CONTACT THE ATELIER <ArrowRight size={15}/></Link></> : <p className="acct-muted" role="status">Loading…</p>) : <>
        <h1>{row.status === 'confirmed' ? <>You’re <em>booked.</em></> : row.status === 'awaiting-customer' ? <>Choose a <em>time.</em></> : <>Request <em>received.</em></>}</h1>
        <p className="acct-muted"><strong>{row.purpose}</strong> · {row.method === 'virtual' ? 'Video call' : 'In person'}</p>
        {row.status === 'confirmed' && <p className="cx-signed-in"><Check size={16}/><span>{day(row.confirmedDate)} at {row.confirmedTime} · Accra</span></p>}
        {row.status === 'awaiting-customer' && <div className="acct-options">
          {row.options.map((option, index) => <button key={`${option.date}-${option.time}`} type="button" className="button acct-option" disabled={busy} onClick={() => reply({ action: 'accept', option: index })}><Check size={15}/>{day(option.date)} at {option.time}</button>)}
          <button type="button" className="acct-link" disabled={busy} onClick={() => reply({ action: 'decline' })}>None of these suit me</button>
        </div>}
        {row.status === 'awaiting-confirmation' && <p className="acct-muted">The team will email you to confirm a time.</p>}
        {row.status === 'cancelled' && <p className="acct-muted">This appointment was cancelled. Contact the atelier to book again.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </>}
    </section>
  </main>;
}
