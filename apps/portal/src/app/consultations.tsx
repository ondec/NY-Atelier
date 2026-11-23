"use client";

import StatusBadge from "./status-badge";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, ChartGantt, ChevronLeft, ChevronRight, Columns3, List, Search, X } from "@/components/icons";
import type { ConsultationRequest } from "../../../mobile/src/lib/consultation-types";
import { calendarDays, consultationDay, consultationSlots, consultationStatuses as statusLabels, filterConsultations, shiftConsultationMonth, type ConsultationFilters, type StaffConsultation } from "@/lib/consultations";
import { statusTone } from "@/lib/status";
import { InventoryDrawer } from "./catalogue-editor";
import ConsultationGantt from "./consultation-gantt";

const consultationChanged = "ny-consultation-changed";

export function useConsultations() {
  const [rows, setRows] = useState<StaffConsultation[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/consultations", { cache: "no-store", signal });
      if (!response.ok) throw new Error();
      setRows(await response.json());
      setUnavailable(false);
    } catch {
      if (!signal?.aborted) setUnavailable(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => { if (!document.hidden) void refresh(controller.signal); };
    queueMicrotask(load);
    const interval = window.setInterval(load, 8000);
    document.addEventListener("visibilitychange", load);
    window.addEventListener(consultationChanged, load);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener(consultationChanged, load);
    };
  }, [refresh]);

  return { rows, unavailable, loading };
}

const slotLabel = (date: string, time: string) =>
  new Intl.DateTimeFormat("en-GH", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Accra" }).format(new Date(`${date}T${time}:00Z`));

function ConsultationActions({ row }: { row: ConsultationRequest }) {
  const [optionCount, setOptionCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (!action || busy) return;
    const data = new FormData(event.currentTarget);
    const options = Array.from({ length: optionCount }, (_, index) => ({
      date: data.get(`date-${index}`), time: data.get(`time-${index}`),
    }));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/consultations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, version: row.version, action, options: action === "propose" ? options : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update the request.");
      setOptionCount(0);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update the request.");
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(consultationChanged));
    }
  }

  return <form onSubmit={submit}>
    {optionCount > 0 && <fieldset className="inventory-size-entries">
      <legend>Suggested times in Accra</legend>
      <p className="consultation-muted">Offer up to three options. The customer can choose one or ask for other times.</p>
      {Array.from({ length: optionCount }, (_, index) => (
        <div className="inventory-form-grid consultation-slot" key={index}>
          <label>Date {index + 1}<input type="date" name={`date-${index}`} required /></label>
          <label>Time {index + 1}<input type="time" name={`time-${index}`} required /></label>
        </div>
      ))}
      {optionCount < 3 && <button className="inventory-quiet-button" type="button" onClick={() => setOptionCount(optionCount + 1)}>Add another time</button>}
      {optionCount > 1 && <button className="inventory-quiet-button" type="button" onClick={() => setOptionCount(optionCount - 1)}>Remove last time</button>}
    </fieldset>}
    <div className="inventory-actions consultation-actions">
      {optionCount > 0 ? <>
        <button className="inventory-quiet-button" type="button" disabled={busy} onClick={() => setOptionCount(0)}>Cancel</button>
        <button className="create-bill-button" type="submit" value="propose" disabled={busy}>Send suggested times</button>
      </> : <>
        <button className="inventory-quiet-button" type="button" disabled={busy} onClick={() => setOptionCount(1)}>Suggest new times</button>
        {row.status === "awaiting-confirmation" && <button className="create-bill-button" type="submit" value="confirm" disabled={busy}>Confirm requested time</button>}
      </>}
    </div>
    {error && <p role="alert" className="consultation-muted">{error}</p>}
  </form>;
}

const emptyFilters: ConsultationFilters = { search: "", status: "", method: "", service: "", from: "", to: "" };
const views = [{ id: "list", label: "List", Icon: List }, { id: "kanban", label: "Kanban", Icon: Columns3 }, { id: "calendar", label: "Calendar", Icon: CalendarDays }, { id: "gantt", label: "Gantt", Icon: ChartGantt }] as const;
const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(`${date}T00:00:00Z`));
const timeLabel = (time: string) => new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" }).format(new Date(`2000-01-01T${time}:00Z`));

function ConsultationDetails({ row, onClose }: { row: StaffConsultation; onClose: () => void }) {
  return <InventoryDrawer label={`Consultation: ${row.purpose}`} onClose={onClose}>
    <div className="consultation-detail">
      <div className="consultation-heading"><div><div className="eyebrow">CONSULTATION DETAILS</div><h2>{row.purpose}</h2></div><button type="button" className="icon-button" aria-label="Close consultation details" onClick={onClose}><X size={20} /></button></div>
      <StatusBadge status={statusLabels[row.status]} />
      <dl className="order-detail-facts">
        <div><dt>Customer</dt><dd>{row.customer_id ? <Link className="text-link" href={`/?section=customers&customer=${row.customer_id}`}>{row.customer_name}</Link> : "Customer not linked"}</dd></div>
        <div><dt>Meeting</dt><dd>{row.method === "in-person" ? "In person" : "Virtual"}</dd></div>
        <div><dt>Requested time · Accra</dt><dd>{slotLabel(row.preferredDate, row.preferredTime)}</dd></div>
        {row.confirmedDate && row.confirmedTime && <div><dt>Confirmed time · Accra</dt><dd>{slotLabel(row.confirmedDate, row.confirmedTime)}</dd></div>}
      </dl>
      <h3>Customer notes</h3><p className="consultation-muted">{row.notes || "No notes provided."}</p>
      {row.status === "awaiting-customer" && <><h3>Suggested times · awaiting customer</h3><ul className="consultation-muted">{row.options.map(option => <li key={`${option.date} ${option.time}`}>{slotLabel(option.date, option.time)} (Accra)</li>)}</ul></>}
      {row.status === "confirmed" && <div className="consultation-actions">
        <p className="consultation-muted">{row.order_reference ? "This consultation is linked to an order." : "Once the consultation has taken place, create an order with the agreed details."}</p>
        {row.order_reference ? <Link className="inventory-quiet-button" href={`/?section=orders&order=${encodeURIComponent(row.order_reference)}`}>View linked order</Link> : <Link className="inventory-quiet-button" href={`/?section=atelier&consultation=${encodeURIComponent(row.id)}`}>Create custom order</Link>}
      </div>}
      {(row.status === "awaiting-confirmation" || row.status === "needs-alternatives") && <><h3>Respond to this request</h3><p className="consultation-muted">Confirm the requested time or offer alternatives for the customer to review in the app.</p><ConsultationActions key={row.version} row={row} /></>}
    </div>
  </InventoryDrawer>;
}

function ConsultationCalendar({ rows, month, setMonth, onOpen, from, to }: { rows: StaffConsultation[]; month: string; setMonth: (month: string) => void; onOpen: (id: string) => void; from: string; to: string }) {
  const today = consultationDay(new Date());
  const days = calendarDays(month);
  const events = rows.flatMap(row => consultationSlots(row).filter(slot => (!from || slot.date >= from) && (!to || slot.date <= to)).map(slot => ({ ...slot, row })));
  const monthLabel = new Intl.DateTimeFormat("en-GH", { month: "long", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(`${month}-01T00:00:00Z`));
  function moveMonth(offset: number) {
    setMonth(shiftConsultationMonth(month, offset));
  }
  function jumpMonth(value: string) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) setMonth(value);
  }
  return <div className="consultation-calendar">
    <div className="consultation-calendar-heading"><div><h3 aria-live="polite">{monthLabel}</h3><p className="consultation-muted">Accra time · Requested and suggested times are provisional.</p></div><div className="inventory-actions consultation-calendar-controls"><button type="button" className="inventory-quiet-button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} />Previous</button><button type="button" className="inventory-quiet-button" onClick={() => setMonth(today.slice(0, 7))}>Today</button><button type="button" className="inventory-quiet-button" aria-label="Next month" onClick={() => moveMonth(1)}>Next<ChevronRight size={16} /></button><label className="consultation-date-filter">Jump to<input type="month" aria-label="Jump to calendar month" value={month} onInput={event => jumpMonth(event.currentTarget.value)} onChange={event => jumpMonth(event.target.value)} /></label></div></div>
    <div className="consultation-calendar-scroll"><div className="consultation-calendar-grid" aria-label={`Consultation calendar for ${monthLabel}`}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <div className="consultation-calendar-weekday" key={day}>{day}</div>)}
      {days.map(day => <section className="consultation-calendar-day" data-outside={!day.startsWith(month)} key={day} aria-label={dateLabel(day)}>
        <time dateTime={day} aria-current={day === today ? "date" : undefined}>{Number(day.slice(-2))}</time>
        {events.filter(event => event.date === day).sort((a, b) => a.time.localeCompare(b.time)).map(event => <button type="button" className="consultation-calendar-event" data-tone={statusTone(statusLabels[event.row.status])} key={`${event.row.id}-${event.time}`} aria-label={`${event.label} ${timeLabel(event.time)}: ${event.row.purpose}, ${event.row.customer_name ?? "Customer"}`} onClick={() => onOpen(event.row.id)}>
          <span>{timeLabel(event.time)} · {event.label}</span><strong>{event.row.purpose}</strong><span>{event.row.customer_name ?? "Customer"}</span>
        </button>)}
      </section>)}
    </div></div>
  </div>;
}

export default function Consultations({ selectedId }: { selectedId?: string }) {
  const { rows, loading, unavailable } = useConsultations();
  const [view, setView] = useState<(typeof views)[number]["id"]>("list");
  const [filters, setFilters] = useState(emptyFilters);
  const [month, setMonth] = useState(() => consultationDay(new Date()).slice(0, 7));
  const [openedId, setOpenedId] = useState(selectedId);
  const [dismissedId, setDismissedId] = useState<string>();
  const activeId = selectedId && dismissedId !== selectedId ? selectedId : openedId;
  const selected = rows.find(row => row.id === activeId);
  const visible = filterConsultations(rows, filters);
  const filtered = Object.values(filters).some(Boolean);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const services = [...new Set(rows.map(row => row.purpose))].sort();
  function updateFilter(field: keyof ConsultationFilters, value: string) {
    setFilters(current => ({ ...current, [field]: value }));
    if (field === "from" && value) setMonth(value.slice(0, 7));
  }
  function open(id: string) { setDismissedId(selectedId); setOpenedId(id); }
  function close() { setDismissedId(selectedId); setOpenedId(undefined); }
  return <>
    <div className="eyebrow">CUSTOMER WORKSPACE</div>
    <div className="page-heading"><div><h1>Consultations.</h1><p>Review requests, agree a time and keep the customer informed.</p></div></div>
    {unavailable && <p className="inventory-message" role="alert">Consultations are unavailable. This page will retry automatically.</p>}
    <section className="panel full-panel order-desk consultation-desk">
      <div className="panel-heading"><div><div className="eyebrow">CONSULTATION DESK</div><h2>Requests <span className="heading-count" aria-live="polite">{loading ? "—" : visible.length}</span></h2></div><div className="order-desk-views" role="group" aria-label="Consultation view">{views.map(({ id, label, Icon }) => <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}</div></div>
      <div className="inventory-toolbar order-desk-toolbar consultation-toolbar">
        <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search consultations</span><input type="search" placeholder="Search customer, service or notes" value={filters.search} onChange={event => updateFilter("search", event.target.value)} /></label>
        <select aria-label="Filter consultation status" value={filters.status} onChange={event => updateFilter("status", event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).filter(([key]) => key !== "local-draft").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="Filter meeting type" value={filters.method} onChange={event => updateFilter("method", event.target.value)}><option value="">All meeting types</option><option value="in-person">In person</option><option value="virtual">Virtual</option></select>
        <select aria-label="Filter consultation service" value={filters.service} onChange={event => updateFilter("service", event.target.value)}><option value="">All services</option>{services.map(service => <option key={service}>{service}</option>)}</select>
        <div className="consultation-date-range"><label className="consultation-date-filter">From<input type="date" aria-label="Consultations from date" value={filters.from} onInput={event => updateFilter("from", event.currentTarget.value)} onChange={event => updateFilter("from", event.target.value)} /></label>
        <label className="consultation-date-filter">To<input type="date" aria-label="Consultations to date" value={filters.to} min={filters.from || undefined} onInput={event => updateFilter("to", event.currentTarget.value)} onChange={event => updateFilter("to", event.target.value)} /></label></div>
        {filtered && <button type="button" className="inventory-quiet-button" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
      </div>
      {invalidRange && <p className="consultation-filter-note" role="alert">Choose an end date on or after the start date.</p>}
      <p className="consultation-filter-note">All times are in Accra. Open a request to review details, confirm or suggest times.</p>
      {loading ? <p className="empty-state" role="status">Loading consultations…</p> : !rows.length ? <p className="empty-state">{unavailable ? "Requests could not be loaded." : "No requests yet. Consultations from the customer app will appear here."}</p> : <>
        {!visible.length && <p className="empty-state">No consultations match these filters.</p>}
        {view === "list" && visible.length > 0 && <div className="table-wrap"><table className="order-table consultation-table"><thead><tr><th>Customer</th><th>Service</th><th>Date & time</th><th>Meeting</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{visible.map(row => <tr key={row.id}>
          <td>{row.customer_id ? <Link className="text-link" href={`/?section=customers&customer=${row.customer_id}`}>{row.customer_name}</Link> : "Customer not linked"}</td>
          <td><button type="button" className="order-reference-button text-link" onClick={() => open(row.id)}>{row.purpose}</button></td>
          <td>{consultationSlots(row).map(slot => <div className="consultation-table-slot" key={`${slot.date} ${slot.time}`}><strong>{dateLabel(slot.date)} · {timeLabel(slot.time)}</strong><small>{slot.label}</small></div>)}</td>
          <td>{row.method === "in-person" ? "In person" : "Virtual"}</td><td><StatusBadge status={statusLabels[row.status]} /></td><td><button type="button" className="inventory-quiet-button" aria-label={`View consultation: ${row.purpose}`} onClick={() => open(row.id)}>View request</button></td>
        </tr>)}</tbody></table></div>}
        {view === "kanban" && <div className="order-board" aria-label="Consultations grouped by status">{Object.entries(statusLabels).filter(([key]) => key !== "local-draft" || visible.some(row => row.status === key)).map(([status, label]) => {
          const cards = visible.filter(row => row.status === status);
          return <section className="order-board-column" aria-label={label} data-tone={statusTone(label)} key={status}><h3>{label}<span>{cards.length}</span></h3>{!cards.length && <p className="consultation-muted">No requests</p>}{cards.map(row => <button type="button" className="order-board-card" key={row.id} aria-label={`View consultation: ${row.purpose}`} onClick={() => open(row.id)}><strong>{row.purpose}</strong><span>{row.customer_name ?? "Customer not linked"}</span><span>{row.method === "in-person" ? "In person" : "Virtual"}</span>{consultationSlots(row).map(slot => <small key={`${slot.date} ${slot.time}`}>{slot.label} · {dateLabel(slot.date)} · {timeLabel(slot.time)}</small>)}</button>)}</section>;
        })}</div>}
        {view === "calendar" && <ConsultationCalendar rows={visible} month={month} setMonth={setMonth} onOpen={open} from={filters.from} to={filters.to} />}
        {view === "gantt" && <ConsultationGantt rows={visible} from={filters.from} to={filters.to} onOpen={open} />}
      </>}
    </section>
    {selected && <ConsultationDetails row={selected} onClose={close} />}
  </>;
}
