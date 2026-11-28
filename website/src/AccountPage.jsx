import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from './NyIcons.jsx';
import { accountCall, firstName, signOut, signedIn, useCustomer } from './account.js';

/** /account: sign in with an email code (or password), then see your orders and appointments. */
export default function AccountPage() {
  const customer = useCustomer();
  useEffect(() => { document.title = customer ? 'Your account · NY Atelier' : 'Sign in · NY Atelier'; }, [customer]);
  if (customer === undefined) return <main id="main" className="acct container"><p className="acct-muted" role="status">Loading…</p></main>;
  return customer ? <Account customer={customer}/> : <SignIn/>;
}

function SignIn() {
  const [step, setStep] = useState('email'); // email · code · password
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(task) {
    setBusy(true); setError('');
    try { await task(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const sendCode = event => { event.preventDefault(); run(async () => { setChallenge(await accountCall('start', { method: 'POST', body: { email } })); setStep('code'); }); };
  const verify = event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    run(async () => signedIn((await accountCall('verify', { method: 'POST', body: { challengeId: challenge.challengeId, code: String(fields.get('code') ?? '').trim() } })).customer));
  };
  const login = event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    run(async () => signedIn((await accountCall('login', { method: 'POST', body: { email, password: String(fields.get('password') ?? '') } })).customer));
  };

  return <main id="main" className="acct acct-signin container">
    <form className="cx-form acct-card" onSubmit={step === 'email' ? sendCode : step === 'code' ? verify : login} aria-busy={busy}>
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Sign <em>in.</em></h1>
      {step === 'email' && <>
        <p className="acct-muted">See your orders and appointments. We email you a code; no password needed.</p>
        <label>EMAIL ADDRESS<input name="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <button className="button button-solid full" type="submit" disabled={busy}>{busy ? 'SENDING…' : 'EMAIL ME A CODE'}</button>
        <button className="acct-link" type="button" onClick={() => { setError(''); setStep('password'); }}>Use my password instead</button>
      </>}
      {step === 'code' && <>
        <p className="acct-muted">We sent a 6-digit code to <strong>{challenge?.destination ?? email}</strong>.</p>
        <label>CODE<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus placeholder="123456"/></label>
        <button className="button button-solid full" type="submit" disabled={busy}>{busy ? 'CHECKING…' : 'SIGN IN'}</button>
        <button className="acct-link" type="button" onClick={() => { setError(''); setStep('email'); }}>Use a different email</button>
      </>}
      {step === 'password' && <>
        <label>EMAIL ADDRESS<input name="email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></label>
        <label>PASSWORD<input name="password" type="password" required autoComplete="current-password"/></label>
        <button className="button button-solid full" type="submit" disabled={busy}>{busy ? 'SIGNING IN…' : 'SIGN IN'}</button>
        <button className="acct-link" type="button" onClick={() => { setError(''); setStep('email'); }}>Email me a code instead</button>
      </>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  </main>;
}

function Account({ customer }) {
  const [orders, setOrders] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [error, setError] = useState('');
  const load = () => Promise.all([
    accountCall('orders').then(result => setOrders(result.orders ?? [])),
    accountCall('appointments').then(result => setAppointments(Array.isArray(result) ? result : [])),
  ]).catch(failure => setError(failure.message));
  useEffect(() => { load(); }, []);
  const name = firstName(customer);

  return <main id="main" className="acct container">
    <header className="acct-head">
      <div><p className="eyebrow">YOUR ACCOUNT</p><h1>{name ? <>Hello, <em>{name}.</em></> : <>Welcome <em>back.</em></>}</h1><p className="acct-muted">{customer.email ?? customer.phone}</p></div>
      <button className="button acct-signout" type="button" onClick={signOut}>SIGN OUT</button>
    </header>
    {!name && <NameForm/>}
    {error && <p className="field-error" role="alert">{error}</p>}

    <section className="acct-section" aria-labelledby="acct-orders">
      <h2 id="acct-orders">Your orders</h2>
      {orders === null ? <p className="acct-muted">Loading…</p> : orders.length === 0 ? <p className="acct-muted">No orders yet.</p> :
        <div className="acct-list">{orders.map(order => <OrderCard key={order.reference} order={order}/>)}</div>}
    </section>

    <section className="acct-section" aria-labelledby="acct-appointments">
      <div className="acct-section-head"><h2 id="acct-appointments">Your appointments</h2><Link className="text-link" to="/appointment">BOOK AN APPOINTMENT <ArrowRight size={15}/></Link></div>
      {appointments === null ? <p className="acct-muted">Loading…</p> : appointments.length === 0 ? <p className="acct-muted">No appointments yet.</p> :
        <div className="acct-list">{appointments.map(row => <AppointmentCard key={row.id} row={row} onChanged={load}/>)}</div>}
    </section>
  </main>;
}

function NameForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    setBusy(true); setError('');
    try { signedIn((await accountCall('me', { method: 'PATCH', body: { name } })).customer); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <form className="cx-form acct-card acct-name" onSubmit={save}>
    <label>YOUR NAME<input name="name" required minLength={2} maxLength={150} autoComplete="name" placeholder="Your full name"/></label>
    <button className="button button-solid" type="submit" disabled={busy}>{busy ? 'SAVING…' : 'SAVE'}</button>
    {error && <p className="field-error" role="alert">{error}</p>}
  </form>;
}

const day = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';

function OrderCard({ order }) {
  const steps = order.workflow?.steps ?? [];
  const now = steps.find(step => step.is_current) ?? steps.find(step => step.state !== 'recorded') ?? steps.at(-1);
  const done = steps.filter(step => step.recorded_at).length;
  const cancelled = order.workflow?.closed && !order.is_complete;
  return <article className="acct-card acct-order">
    <div className="acct-order-top"><span className="acct-tag">{order.category}</span><small>{order.reference}</small></div>
    <h3>{cancelled ? 'Cancelled' : order.is_complete ? (order.fulfilment_method === 'Delivery' ? 'Delivered' : 'Collected') : now?.label ?? order.status}</h3>
    {!order.is_complete && !cancelled && now?.help && <p className="acct-muted">{now.help}</p>}
    {order.delivery_status?.label && !order.is_complete && <p className="acct-status">{order.delivery_status.label}</p>}
    {steps.length > 0 && <ol className="acct-steps" aria-label={`${done} of ${steps.length} steps done`}>{steps.map(step => <li key={step.key} className={step.recorded_at ? 'is-done' : step === now ? 'is-now' : ''} title={step.label}/>)}</ol>}
    <dl className="acct-facts">
      {order.items?.length > 0 && <div><dt>Pieces</dt><dd>{order.items.map(item => item.garment_name).join(' · ')}</dd></div>}
      {order.expected_completion_date && !order.is_complete && <div><dt>Expected</dt><dd>{day(order.expected_completion_date)}</dd></div>}
      {order.fulfilment_method && <div><dt>{order.fulfilment_method === 'Delivery' ? 'Delivery' : 'Collect from'}</dt><dd>{order.fulfilment_method === 'Delivery' ? (order.delivery_promise?.by ? `By ${day(order.delivery_promise.by)}` : 'To your address') : order.store?.name ?? 'The atelier'}</dd></div>}
    </dl>
    {order.fulfilment_method !== 'Delivery' && now?.key === 'ready_collection' && order.store?.map && <a className="text-link" href={order.store.map} target="_blank" rel="noreferrer">DIRECTIONS <ArrowUpRight size={15}/></a>}
  </article>;
}

const statusLabel = { 'awaiting-confirmation': 'Waiting for the team', 'awaiting-customer': 'Choose a time', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Done' };

function AppointmentCard({ row, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const when = row.status === 'confirmed' ? `${day(row.confirmedDate)} at ${row.confirmedTime}` : `${day(row.preferredDate)} at ${row.preferredTime} (requested)`;
  async function reply(body) {
    setBusy(true); setError('');
    try { await accountCall(`appointments/${row.id}`, { method: 'PATCH', body: { version: row.version, ...body } }); await onChanged(); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <article className="acct-card acct-appointment">
    <div className="acct-order-top"><span className={`acct-tag ${row.status === 'awaiting-customer' ? 'is-action' : ''}`}>{statusLabel[row.status] ?? row.status}</span><small>{row.method === 'virtual' ? 'Video call' : 'In person'}</small></div>
    <h3>{row.purpose}</h3>
    <p className="acct-muted">{when} · Accra</p>
    {row.status === 'awaiting-customer' && row.options?.length > 0 && <div className="acct-options">
      <p>The team suggested these times. Pick one:</p>
      {row.options.map((option, index) => <button key={`${option.date}-${option.time}`} type="button" className="button acct-option" disabled={busy} onClick={() => reply({ action: 'accept', option: index })}><Check size={15}/>{day(option.date)} at {option.time}</button>)}
      <button type="button" className="acct-link" disabled={busy} onClick={() => reply({ action: 'decline' })}>None of these suit me</button>
    </div>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </article>;
}
