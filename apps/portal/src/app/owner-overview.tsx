"use client";

import {useCallback, useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, RefreshCw} from '@/components/icons';
import type {DemoOrder} from '@/lib/orders';
import type {OwnerFinances, OwnerOverviewData, OverviewPeriod} from '@/lib/owner-overview';
import {consultationSlots, consultationStatuses, type StaffConsultation} from '@/lib/consultations';
import {isClosedStatus} from '@/lib/status';
import {saleMoney} from '@/lib/studio-sales';
import {OrderTable, orderHref, serviceName} from './order-table';
import StatusBadge from './status-badge';

const services = ['Ready-to-Wear', 'Custom', 'Alterations'] as const;
const serviceLabel = (service: string) => service === 'Custom' ? 'Bespoke' : service;
const shiftDay = (day: string, days: number) => {const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);};
const shortDate = (day: string) => new Intl.DateTimeFormat('en-GH', {day: 'numeric', month: 'short', timeZone: 'Africa/Accra'}).format(new Date(`${day}T12:00:00Z`));
const isReady = (order: DemoOrder) => order.workflow && !order.workflow.legacy ? (order.workflow.current === 'ready_collection' || (order.workflow.current === 'packaged' && order.fulfilment_method === 'Delivery')) : ['ready for collection', 'ready for delivery', 'ready for pickup', 'ready for handover'].includes(order.status.trim().toLowerCase());
type Desk = 'active' | 'due' | 'overdue' | 'ready';

function SalesTrend({finance}: {finance: OwnerFinances}) {
  const peak = Math.max(1, ...finance.series.map(point => point.total_minor));
  const barWidth = 600 / finance.series.length;
  return <div className="owner-sales-trend">
    {finance.sales_count ? <svg viewBox="0 0 600 125" role="img" aria-label={`Recorded Studio sales from ${shortDate(finance.from)} to ${shortDate(finance.to)}: ${saleMoney(finance.sales_minor)}`} preserveAspectRatio="none">
      {[0, 1, 2].map(line => <line key={line} x1="0" x2="600" y1={10 + line * 50} y2={10 + line * 50} className="owner-chart-grid"/>)}
      {finance.series.map((point, index) => <rect key={point.date} x={index * barWidth + barWidth * .2} y={115 - point.total_minor / peak * 100} width={barWidth * .6} height={point.total_minor / peak * 100} rx="2"><title>{shortDate(point.date)}: {saleMoney(point.total_minor)}</title></rect>)}
    </svg> : <div className="owner-chart-empty">No Studio sales recorded in this period.</div>}
    <div className="owner-chart-axis"><span>{shortDate(finance.from)}</span><span>{shortDate(finance.to)}</span></div>
    {finance.sales_count > 0 && <details className="owner-chart-data"><summary>View sales breakdown</summary><table><thead><tr><th>{finance.period === 'year' ? 'Month' : 'Date'}</th><th>Recorded sales</th></tr></thead><tbody>{finance.series.map(point => <tr key={point.date}><td>{shortDate(point.date)}</td><td>{saleMoney(point.total_minor)}</td></tr>)}</tbody></table></details>}
  </div>;
}

function ConsultationItem({row, now}: {row: StaffConsultation; now: Date}) {
  const slot = consultationSlots(row)[0];
  const passed = new Date(`${slot.date}T${slot.time}:00Z`).getTime() < now.getTime();
  const action = row.status === 'awaiting-confirmation' ? 'Review request' : row.status === 'needs-alternatives' ? 'Suggest a new time' : row.status === 'awaiting-customer' ? 'View proposed times' : passed ? 'Follow up' : 'View appointment';
  return <Link prefetch={false} href={`/?section=appointments&consultation=${encodeURIComponent(row.id)}`} className="owner-consultation-row">
    <div className="owner-consultation-top"><strong>{row.customer_name ?? 'Customer'}</strong><StatusBadge status={row.status === 'confirmed' && passed ? 'Action needed' : consultationStatuses[row.status]}/></div>
    <span>{row.purpose}</span><small>{shortDate(slot.date)} · {slot.time} · {row.method === 'virtual' ? 'Virtual' : 'In person'}</small>
    <span className="owner-consultation-action">{action}<ArrowRight size={14}/></span>
  </Link>;
}

/**
 * The NY Office overview for the Owner, general manager and operations manager: orders, today's deliveries,
 * production, appointments and (Owner and general manager only) sales.
 */
export default function OwnerOverview({initialOrders, initiallyUnavailable, showFinances = true}: {initialOrders: DemoOrder[]; initiallyUnavailable: boolean; showFinances?: boolean}) {
  const [data, setData] = useState<OwnerOverviewData>();
  const [period, setPeriod] = useState<OverviewPeriod>('month');
  const [desk, setDesk] = useState<Desk>('active');
  const [consultationView, setConsultationView] = useState<'review' | 'upcoming' | 'waiting' | 'followup'>('review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const pending = useRef(false);
  const requestVersion = useRef(0);
  const invalidateRequests = useCallback(() => {++requestVersion.current; pending.current = false;}, []);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (pending.current) return;
    pending.current = true;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/owner-overview?period=${period}`, {cache: 'no-store', signal});
      if (!response.ok) throw new Error('Could not refresh the overview.');
      const result: OwnerOverviewData = await response.json();
      if (!signal?.aborted && version === requestVersion.current) {setData(result); setNow(new Date()); setError('');}
    } catch {if (!signal?.aborted && version === requestVersion.current) setError('Updates are unavailable. Showing the last loaded records.');}
    finally {if (version === requestVersion.current) {pending.current = false; if (!signal?.aborted) setLoading(false);}}
  }, [period]);
  useEffect(() => {
    const controller = new AbortController();
    // A load cancelled before it starts (the page closing or re-opening) must not block the next one.
    const load = () => {if (!document.hidden && !controller.signal.aborted) void refresh(controller.signal);};
    queueMicrotask(load);
    const timer = setInterval(load, 60000);
    document.addEventListener('visibilitychange', load);
    return () => {controller.abort(); invalidateRequests(); clearInterval(timer); document.removeEventListener('visibilitychange', load);};
  }, [refresh, invalidateRequests]);

  const orders = data?.orders ?? initialOrders;
  const unavailable = data ? data.orders === null : initiallyUnavailable;
  const active = orders.filter(order => !order.is_complete && !isClosedStatus(order.status));
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
  const weekEnd = shiftDay(today, 6);
  const deadlineSort = (a: DemoOrder, b: DemoOrder) => (a.expected_completion_date ?? '9999').localeCompare(b.expected_completion_date ?? '9999') || a.reference.localeCompare(b.reference);
  const due = active.filter(order => order.expected_completion_date && order.expected_completion_date >= today && order.expected_completion_date <= weekEnd).sort(deadlineSort);
  const overdue = active.filter(order => order.expected_completion_date && order.expected_completion_date < today).sort(deadlineSort);
  const ready = active.filter(isReady);
  const selected = {active: [...active].sort(deadlineSort), due, overdue, ready}[desk];
  const nextDeadline = active.filter(order => order.expected_completion_date && order.expected_completion_date > weekEnd).sort(deadlineSort)[0];
  const consultations = data?.consultations?.filter(row => !row.order_reference && row.status !== 'local-draft').sort((a, b) => {
    const priority = (row: StaffConsultation) => row.status === 'awaiting-confirmation' || row.status === 'needs-alternatives' ? 0 : row.status === 'awaiting-customer' ? 2 : 1;
    return priority(a) - priority(b) || consultationSlots(a)[0].date.localeCompare(consultationSlots(b)[0].date);
  });
  const finance = data?.finances;
  const consultationGroups = {
    review: consultations?.filter(row => row.status === 'awaiting-confirmation' || row.status === 'needs-alternatives'),
    upcoming: consultations?.filter(row => row.status === 'confirmed' && new Date(`${consultationSlots(row)[0].date}T${consultationSlots(row)[0].time}:00Z`).getTime() >= now.getTime()),
    waiting: consultations?.filter(row => row.status === 'awaiting-customer'),
    followup: consultations?.filter(row => row.status === 'confirmed' && new Date(`${consultationSlots(row)[0].date}T${consultationSlots(row)[0].time}:00Z`).getTime() < now.getTime()),
  };
  const visibleConsultations = consultationGroups[consultationView];
  // Today across the business: deliveries, the production floor and appointments.
  const deliveries = data?.deliveries;
  const openDeliveries = deliveries?.filter(item => !item.delivered_at) ?? [];
  const dueDeliveries = openDeliveries.filter(item => item.due_by && item.due_by <= today).sort((a, b) => (a.due_by ?? '').localeCompare(b.due_by ?? ''));
  const lateDeliveries = dueDeliveries.filter(item => item.due_by! < today);
  const outForDelivery = openDeliveries.filter(item => item.stage === 'out_for_delivery');
  const readyToSend = openDeliveries.filter(item => item.ready);
  const deliveredToday = deliveries?.filter(item => item.delivered_at && new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Accra'}).format(new Date(item.delivered_at)) === today) ?? [];
  const floor = data?.production?.filter(item => !item.is_complete) ?? [];
  const noTailor = floor.filter(item => !item.assigned_tailor);
  const lateProduction = floor.filter(item => item.expected_completion_date && item.expected_completion_date < today);
  const productionAttention = [...lateProduction, ...noTailor.filter(item => !lateProduction.includes(item))];
  const appointmentsToday = consultations?.filter(row => row.status === 'confirmed' && consultationSlots(row)[0].date === today) ?? [];
  const known = (value: unknown, number: number) => value === undefined ? '…' : value === null ? '—' : number;
  const financeCurrent = finance?.period === period;
  const count = (value: number) => unavailable ? '—' : value;
  const financial = (value: number | undefined) => financeCurrent && value !== undefined ? saleMoney(value) : '—';
  return <div className="owner-overview">
    <div className="eyebrow">NY OFFICE / OVERVIEW</div>
    <div className="page-heading owner-overview-heading"><div><h1>At a glance.</h1><p>{new Intl.DateTimeFormat('en-GH', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Accra'}).format(now)}</p></div><div className="owner-refresh"><span aria-live="polite">{data ? `Updated ${new Intl.DateTimeFormat('en-GH', {hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra'}).format(new Date(data.updatedAt))}` : 'Live workspace'}</span><button type="button" className="inventory-quiet-button" disabled={loading} onClick={() => void refresh()} aria-label="Refresh overview"><RefreshCw size={16}/>{loading ? 'Updating…' : 'Refresh'}</button></div></div>
    {error && <p className="owner-overview-warning" role="status">{error}</p>}
    <div className="owner-activity-strip" aria-label="Order summary">
      <button type="button" onClick={() => setDesk('active')} aria-pressed={desk === 'active'}><span>Active orders</span><strong>{count(active.length)}</strong><small>Across all services</small></button>
      <button type="button" onClick={() => setDesk('due')} aria-pressed={desk === 'due'}><span>Due in the next 7 days</span><strong>{count(due.length)}</strong><small>{shortDate(today)} – {shortDate(weekEnd)}</small></button>
      <button type="button" onClick={() => setDesk('overdue')} aria-pressed={desk === 'overdue'} data-attention={overdue.length ? 'danger' : undefined}><span>Past the expected date</span><strong>{count(overdue.length)}</strong><small>{overdue.length ? 'Review the promised dates' : 'No overdue orders'}</small></button>
    </div>
    <section className="owner-today" aria-label="Today">
      <Link prefetch={false} href="/deliveries" className="owner-today-card" data-attention={lateDeliveries.length ? 'danger' : undefined}><span>Deliveries due today</span><strong>{known(deliveries, dueDeliveries.length)}</strong><small>{deliveries ? `${outForDelivery.length} out now · ${readyToSend.length} ready to send · ${deliveredToday.length} delivered today` : 'Loading deliveries…'}</small></Link>
      <Link prefetch={false} href="/?section=production" className="owner-today-card" data-attention={lateProduction.length ? 'danger' : undefined}><span>In production</span><strong>{known(data?.production, floor.length)}</strong><small>{data?.production ? `${lateProduction.length} past their date · ${noTailor.length} without a tailor` : 'Loading production…'}</small></Link>
      <Link prefetch={false} href="/?section=appointments" className="owner-today-card"><span>Appointments today</span><strong>{known(data?.consultations, appointmentsToday.length)}</strong><small>{consultationGroups.review ? `${consultationGroups.review.length} waiting for review` : 'Loading appointments…'}</small></Link>
      {showFinances && <Link prefetch={false} href="/?section=finances&finance=sales" className="owner-today-card"><span>Sales {period === 'month' ? 'this month' : period === '30days' ? 'in 30 days' : 'this year'}</span><strong>{financial(finance?.sales_minor)}</strong><small>{financeCurrent ? `${finance.sales_count} recorded sale${finance.sales_count === 1 ? '' : 's'}` : 'Loading sales…'}</small></Link>}
    </section>
    <div className="owner-action-grid">
      <section className="panel owner-deliveries"><div className="panel-heading"><div><div className="eyebrow">DELIVERIES</div><h2>Due today</h2></div><Link prefetch={false} href="/deliveries" className="text-link">Delivery board<ArrowRight size={16}/></Link></div>
        {deliveries === undefined ? <p className="empty-state" role="status">Loading deliveries…</p> : deliveries === null ? <p className="empty-state">Deliveries are temporarily unavailable.</p> : !dueDeliveries.length ? <p className="empty-state">Nothing due today.{readyToSend.length ? ` ${readyToSend.length} packaged and ready to send.` : ''}</p>
          : <div className="owner-deadline-list">{dueDeliveries.slice(0, 5).map(item => <Link prefetch={false} href={orderHref(item.reference, 'overview')} key={item.reference}><div><strong>{item.reference}</strong><span>{item.customer.name} · {item.area ?? item.zone ?? 'No area'} · {item.courier?.name ?? 'No courier yet'}</span></div><time dateTime={item.due_by!} data-late={item.due_by! < today ? 'true' : undefined}>{item.due_by! < today ? `Late · ${shortDate(item.due_by!)}` : item.stage === 'out_for_delivery' ? 'Out now' : 'Today'}</time></Link>)}</div>}
        {dueDeliveries.length > 5 && <div className="owner-panel-footer">{dueDeliveries.length - 5} more on the delivery board.</div>}
      </section>
      <section className="panel owner-production"><div className="panel-heading"><div><div className="eyebrow">PRODUCTION</div><h2>Needs attention</h2></div><Link prefetch={false} href="/?section=production" className="text-link">Production<ArrowRight size={16}/></Link></div>
        {data?.production === undefined ? <p className="empty-state" role="status">Loading production…</p> : data.production === null ? <p className="empty-state">Production is temporarily unavailable.</p> : !productionAttention.length ? <p className="empty-state">{floor.length ? `All ${floor.length} pieces on the floor have a tailor and are on time.` : 'Nothing in production right now.'}</p>
          : <div className="owner-deadline-list">{productionAttention.slice(0, 5).map(item => <Link prefetch={false} href={`/?section=production&order=${encodeURIComponent(item.reference)}`} key={item.reference}><div><strong>{item.reference}</strong><span>{item.customer_name} · {item.assigned_tailor?.name ?? 'No tailor yet'}</span></div><time dateTime={item.expected_completion_date ?? undefined} data-late={item.expected_completion_date && item.expected_completion_date < today ? 'true' : undefined}>{item.expected_completion_date && item.expected_completion_date < today ? `Late · ${shortDate(item.expected_completion_date)}` : 'Assign a tailor'}</time></Link>)}</div>}
        {productionAttention.length > 5 && <div className="owner-panel-footer">{productionAttention.length - 5} more in Production.</div>}
      </section>
    </div>
    <section className="panel owner-order-desk"><div className="panel-heading"><div><div className="eyebrow">ORDER DESK</div><h2>In motion</h2></div><Link prefetch={false} href="/?section=orders" className="text-link">All orders<ArrowRight size={16}/></Link></div>
      <div className="owner-desk-filters" role="group" aria-label="Orders in view">{([{id: 'active', label: 'All active', count: active.length}, {id: 'due', label: 'Due in 7 days', count: due.length}, {id: 'overdue', label: 'Overdue', count: overdue.length}, {id: 'ready', label: 'Ready for handover', count: ready.length}] as const).map(item => <button key={item.id} type="button" aria-pressed={desk === item.id} onClick={() => setDesk(item.id)}>{item.label}<span>{count(item.count)}</span></button>)}</div>
      <OrderTable orders={selected.slice(0, 8)} unavailable={unavailable} section="overview" showFulfilment showPayment/>
      {!unavailable && selected.length > 8 && <div className="owner-panel-footer">Showing 8 of {selected.length} orders. <Link prefetch={false} className="text-link" href="/?section=orders">Open the order desk<ArrowRight size={14}/></Link></div>}
    </section>
    <div className="owner-action-grid">
      <section className="panel owner-consultations"><div className="panel-heading"><div><div className="eyebrow">TODAY’S FOCUS</div><h2>Appointments</h2></div><Link prefetch={false} href="/?section=appointments" className="text-link">View all<ArrowRight size={16}/></Link></div>
        <div className="owner-desk-filters" role="group" aria-label="Appointments in view">{([{id:'review',label:'Needs review'},{id:'upcoming',label:'Upcoming'},{id:'waiting',label:'Awaiting customer'},{id:'followup',label:'Follow-up'}] as const).map(view => <button type="button" key={view.id} aria-pressed={consultationView===view.id} onClick={()=>setConsultationView(view.id)}>{view.label}<span>{consultationGroups[view.id]?.length ?? '—'}</span></button>)}</div>
        {visibleConsultations === undefined ? <p className="empty-state" role="status">{data?.consultations === null ? 'Appointments are temporarily unavailable.' : 'Loading appointments…'}</p> : !visibleConsultations.length ? <p className="empty-state">No appointments in this view.</p> : <div className="owner-consultation-list">{visibleConsultations.slice(0, 3).map(row => <ConsultationItem key={row.id} row={row} now={now}/>)}</div>}
        {visibleConsultations && visibleConsultations.length > 3 && <div className="owner-panel-footer">{visibleConsultations.length - 3} more appointments in the appointment desk.</div>}
      </section>
      <section className="panel owner-deadlines"><div className="panel-heading"><div><div className="eyebrow">{shortDate(today)} – {shortDate(weekEnd)}</div><h2>Coming due</h2></div><span className="owner-panel-count">{count(due.length)} orders</span></div>
        <div className="owner-deadline-services">{services.map(service => <div key={service}><span>{serviceLabel(service)}</span><strong>{count(due.filter(order => order.category === service).length)}</strong></div>)}</div>
        {unavailable ? <p className="empty-state">Deadlines are temporarily unavailable.</p> : due.length ? <div className="owner-deadline-list">{due.slice(0, 5).map(order => <Link prefetch={false} href={orderHref(order.reference, 'overview')} key={order.reference}><div><strong>{order.reference}</strong><span>{order.customer_name} · {serviceName(order)}</span></div><time dateTime={order.expected_completion_date!}>{shortDate(order.expected_completion_date!)}</time></Link>)}</div> : <div className="owner-deadline-empty"><p>No orders are due in this 7-day window.</p>{nextDeadline && <Link prefetch={false} href={orderHref(nextDeadline.reference, 'overview')}>Next recorded deadline<strong>{shortDate(nextDeadline.expected_completion_date!)} · {nextDeadline.reference}<ArrowRight size={14}/></strong></Link>}</div>}
        {!unavailable && active.some(order => !order.expected_completion_date) && <div className="owner-panel-footer">{active.filter(order => !order.expected_completion_date).length} active orders still need an expected date.</div>}
      </section>
    </div>
    {showFinances && <section className="owner-business"><div className="owner-section-heading"><div><div className="eyebrow">BUSINESS PERFORMANCE</div><h2>Sales & operations</h2></div><label className="owner-period"><span>Reporting period</span><select value={period} onChange={event => setPeriod(event.target.value as OverviewPeriod)}><option value="month">This month</option><option value="30days">Last 30 days</option><option value="year">This year</option></select></label></div>
      <div className="owner-performance-grid"><section className="panel owner-sales-panel"><div className="panel-heading"><div><h3>Recorded Studio sales</h3><p>{financeCurrent ? `${shortDate(finance.from)} – ${shortDate(finance.to)}` : 'Loading sales totals…'}</p></div><Link prefetch={false} href="/?section=finances&finance=sales" className="text-link">Sales register<ArrowRight size={15}/></Link></div><div className="owner-sales-total"><strong>{financial(finance?.sales_minor)}</strong><span>{financeCurrent ? `${finance.sales_count} paid ${finance.sales_count === 1 ? 'sale' : 'sales'}` : '—'}</span></div>
        {financeCurrent ? <><p className="owner-sales-comparison">{finance.previous_sales_minor > 0 ? `${((finance.sales_minor - finance.previous_sales_minor) / finance.previous_sales_minor * 100).toFixed(1)}% vs the previous ${Math.round((new Date(`${finance.to}T12:00:00Z`).getTime() - new Date(`${finance.from}T12:00:00Z`).getTime()) / 86400000) + 1} days` : 'No recorded sales in the previous comparison period.'}</p><SalesTrend finance={finance}/></> : <p className="empty-state">{data?.finances === null ? 'Financial records are temporarily unavailable.' : 'Loading recorded sales…'}</p>}
        <div className="owner-finance-detail"><div><span>Average sale</span><strong>{financeCurrent && finance.average_sale_minor !== null ? saleMoney(finance.average_sale_minor) : '—'}</strong></div><div><span>Payroll paid in period</span><strong>{financial(finance?.payroll_paid_minor)}</strong></div></div>
      </section><section className="panel owner-operations-panel"><div className="panel-heading"><div><h3>Workload by service</h3><p>Current open orders</p></div></div><div className="table-wrap"><table className="owner-workload-table"><thead><tr><th>Service</th><th>Active</th><th>Overdue</th><th>Ready</th></tr></thead><tbody>{services.map(service => <tr key={service}><td><Link prefetch={false} href={`/?section=orders&type=${encodeURIComponent(service)}`}>{serviceLabel(service)}<ArrowRight size={12}/></Link></td><td>{count(active.filter(order => order.category === service).length)}</td><td className={overdue.some(order => order.category === service) ? 'owner-overdue-value' : ''}>{count(overdue.filter(order => order.category === service).length)}</td><td>{count(ready.filter(order => order.category === service).length)}</td></tr>)}</tbody></table></div><div className="owner-payroll-status"><Link prefetch={false} href="/?section=finances&finance=salaries"><span>Approved payroll still to pay</span><strong>{financial(finance?.payroll_outstanding_minor)}</strong><ArrowRight size={15}/></Link><Link prefetch={false} href="/?section=finances&finance=salaries"><span>Salary batches awaiting approval</span><strong>{financeCurrent ? finance.salary_approvals : '—'}</strong><ArrowRight size={15}/></Link></div></section></div>
      <p className="owner-finance-scope">Studio receipts and recorded tailor payroll only. Other expenses and profit are not included.</p>
    </section>}
  </div>;
}
