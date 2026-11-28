"use client";

import FilterMenu from "./filter-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, ClipboardList, Search, UserRound } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";
import type { MeasurementUnit } from "@/lib/fitting-measurements";
import type { Fitting, MeasurementTemplate } from "./customers-workspace";
import FittingReadings from "./fitting-readings";
import OrderDetailsContent, { type OrderEndpoints } from "./order-details-content";
import { orderDate } from "./order-table";
import StatusBadge from "./status-badge";

export type Tailor = { id: number; name: string };
export type ProductionOrder = Pick<DemoOrder, "reference" | "category" | "customer_name" | "service_offering" | "status" | "expected_completion_date" | "is_complete" | "fulfilment_method"> & {
  items: { garment_name: string; wearer_name: string | null }[]; assigned_tailor: Tailor | null; has_fitting: boolean; inspiration_count: number;
  /** When it reached this person: sent to production (managers) or assigned (tailors). */
  arrived_at?: string | null;
};
export type Detail = {
  order: DemoOrder; customer: { name: string; phone: string | null; email: string | null; account_reference: string | null };
  fitting: Fitting | null; fields: Record<string, string>; templates: Record<string, MeasurementTemplate>; tailors: Tailor[]; can_manage: boolean;
};

const productionHref = (reference?: string) => `/?section=production${reference ? `&order=${encodeURIComponent(reference)}` : ""}`;
export const productionEndpoints: OrderEndpoints = {
  update: (reference) => `/api/staff-production/${encodeURIComponent(reference)}/workflow`,
  detail: (reference) => `/api/staff-production/${encodeURIComponent(reference)}`,
};
export const typeLabel = (category: string) => category === "Custom" ? "Custom order" : "Alteration";

export async function productionJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Production is unavailable. Try again.");
  return result as T;
}

export default function ProductionWorkspace({ reference }: { reference?: string }) {
  return reference ? <ProductionOrderView key={reference} reference={reference} /> : <ProductionList />;
}

function ProductionList() {
  const [data, setData] = useState<{ orders: ProductionOrder[]; tailors: Tailor[]; can_manage: boolean }>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "all">("active");
  const [tailor, setTailor] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    productionJson<typeof data>("/api/staff-production", { signal: controller.signal }).then((result) => { setData(result); setError(""); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [retry]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (data?.orders ?? []).filter((order) => (status === "all" || (status === "completed") === order.is_complete)
      && (!tailor || (tailor === "none" ? !order.assigned_tailor : String(order.assigned_tailor?.id) === tailor))
      && (!search || [order.reference, order.customer_name, ...order.items.map((item) => item.garment_name)].some((value) => value.toLowerCase().includes(search))));
  }, [data, query, status, tailor]);
  const unassigned = data?.orders.filter((order) => !order.is_complete && !order.assigned_tailor).length ?? 0;

  return <>
    <div className="eyebrow">NY OFFICE / PRODUCTION</div>
    <div className="page-heading"><div><h1>{data && !data.can_manage ? "Your work." : "Production."}</h1>
      <p>{data && !data.can_manage ? "Orders assigned to you, with measurements, inspiration and specifications." : "Every custom and alteration order: who is making it, and where it stands."}</p></div><a className="create-bill-button" href="/production">Open NY Production <ArrowRight size={16} /></a></div>
    {data?.can_manage && unassigned > 0 && <p className="production-callout"><UserRound size={17} /> {unassigned} active {unassigned === 1 ? "order needs" : "orders need"} a tailor. <button type="button" className="text-link" onClick={() => { setTailor("none"); setStatus("active"); }}>Show them</button></p>}
    <div className="inventory-toolbar production-toolbar">
      <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search production orders</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or garment" /></label>
      <FilterMenu count={[status !== "active", data?.can_manage && tailor].filter(Boolean).length} onClear={() => { setStatus("active"); setTailor(""); }}>
        <label>Progress<select aria-label="Filter by progress" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="active">In progress</option><option value="completed">Completed</option><option value="all">All orders</option></select></label>
        {data?.can_manage && <label>Tailor<select aria-label="Filter by tailor" value={tailor} onChange={(event) => setTailor(event.target.value)}><option value="">All tailors</option><option value="none">Not assigned</option>{data.tailors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      </FilterMenu>
    </div>
    {error ? <p className="collection-error" role="alert">{error} <button className="inventory-quiet-button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>
      : !data ? <p role="status" className="consultation-muted">Loading production…</p>
      : !visible.length ? <div className="panel production-empty"><ClipboardList size={36} /><h2>{data.orders.length ? "No orders match." : data.can_manage ? "No custom or alteration orders yet." : "Nothing assigned to you yet."}</h2><p>{data.can_manage ? "Custom and alteration orders appear here once the front desk sends them to production." : "When the production manager assigns you an order, it appears here."}</p></div>
      : <ul className="production-list">{visible.map((order) => {
        const overdue = !order.is_complete && Boolean(order.expected_completion_date && order.expected_completion_date < new Date().toISOString().slice(0, 10));
        return <li key={order.reference}><Link prefetch={false} href={productionHref(order.reference)} className="production-card">
          <span className="production-card-main">
            <small>{typeLabel(order.category)}{order.service_offering ? ` · ${order.service_offering}` : ""}</small>
            <strong>{order.customer_name}</strong>
            <span>{order.items.map((item) => item.garment_name).join(" · ")}</span>
            <small className="production-card-reference">{order.reference}{order.has_fitting ? " · Fitting linked" : ""}{order.inspiration_count ? ` · ${order.inspiration_count} inspiration` : ""}</small>
          </span>
          <span className="production-card-meta">
            <StatusBadge status={overdue ? "Overdue" : order.status} tone={overdue ? "danger" : undefined} />
            <span className={order.assigned_tailor ? "production-tailor" : "production-tailor is-empty"}><UserRound size={14} />{order.assigned_tailor?.name ?? "No tailor"}</span>
            <small>{order.is_complete ? "Completed" : order.expected_completion_date ? `Due ${orderDate(order.expected_completion_date)}` : "Date to be agreed"}</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link></li>;
      })}</ul>}
  </>;
}

function ProductionOrderView({ reference }: { reference: string }) {
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    productionJson<Detail>(productionEndpoints.detail(reference), { signal: controller.signal }).then((result) => { setDetail(result); setError(""); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [reference, retry]);

  const back = <Link prefetch={false} className="text-link production-back" href={productionHref()}><ArrowLeft size={16} />All production orders</Link>;
  if (error) return <>{back}<p className="collection-error" role="alert">{error} <button className="inventory-quiet-button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p></>;
  if (!detail) return <>{back}<p role="status" className="consultation-muted">Loading order {reference}…</p></>;
  const { order, customer } = detail;

  return <>
    {back}
    <div className="eyebrow">{typeLabel(order.category).toUpperCase()} · {order.reference}</div>
    <div className="page-heading"><div><h1>{customer.name}.</h1><p>{order.items.map((item) => item.garment_name + (item.wearer_name ? ` for ${item.wearer_name}` : "")).join(" · ")}</p></div><StatusBadge status={order.status} /></div>
    <ProductionOrderPanels detail={detail} onChange={setDetail} onAssigned={() => router.refresh()} onReturned={() => router.push(productionHref())} />
  </>;
}

/** Tailor, customer and fitting beside the full order (specifications, inspiration, delivery, stages, timeline). */
export function ProductionOrderPanels({ detail, onChange, onAssigned, onReturned }: { detail: Detail; onChange: (detail: Detail) => void; onAssigned?: () => void; onReturned?: () => void }) {
  const [unit, setUnit] = useState<MeasurementUnit>("in");
  const { order, customer, fitting } = detail;
  const template = fitting?.garment_type ? detail.templates[fitting.garment_type] : undefined;
  return <>
    <div className="production-detail">
      <div className="production-detail-side">
        <TailorCard key={order.assigned_tailor?.id ?? "none"} detail={detail} onChanged={(next) => { onChange(next); onAssigned?.(); }} />
        {detail.can_manage && <SendBackCard key={detail.order.reference} order={detail.order} onReturned={onReturned} />}
        {detail.can_manage && <ToReceptionCard key={`reception-${detail.order.reference}`} order={detail.order} onHanded={onReturned} />}
        <section className="panel production-card-section" aria-label="Customer">
          <h2>Customer</h2>
          <dl className="production-facts">
            <div><dt>Name</dt><dd>{customer.name}</dd></div>
            {customer.account_reference && <div><dt>Account</dt><dd>{customer.account_reference}</dd></div>}
            {customer.phone && <div><dt>Phone</dt><dd><a className="text-link" href={`tel:${customer.phone.replace(/[^0-9+]/g, "")}`}>{customer.phone}</a></dd></div>}
            {customer.email && <div><dt>Email</dt><dd>{customer.email}</dd></div>}
          </dl>
        </section>
        <section className="panel production-card-section" aria-label="Fitting">
          <div className="production-section-heading"><h2>Fitting</h2>{fitting && <label className="production-unit"><span className="sr-only">Measurement unit</span><select value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)}><option value="in">Inches</option><option value="cm">Centimetres</option></select></label>}</div>
          {fitting ? <>
            <p className="consultation-muted">{template?.name ?? (fitting.garment_type || "General measurements")} · measured {orderDate(fitting.measured_on)}</p>
            <FittingReadings fitting={fitting} fields={detail.fields} template={template} unit={unit} />
            {fitting.notes && <div className="order-specifications"><h3>Fitting notes</h3><p>{fitting.notes}</p></div>}
          </> : <p className="consultation-muted">No fitting is linked to this order.</p>}
        </section>
      </div>
      <div className="production-detail-main">
        <OrderDetailsContent order={order} showWorkspaceLinks={false} endpoints={productionEndpoints} onUpdated={(next) => onChange({ ...detail, order: next })} />
      </div>
    </div>
  </>;
}

export function TailorCard({ detail, onChanged }: { detail: Detail; onChanged: (detail: Detail) => void }) {
  const current = detail.order.assigned_tailor;
  const [choice, setChoice] = useState(String(current?.id ?? ""));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const closed = detail.order.is_complete || detail.order.workflow?.closed;

  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const next = await productionJson<Detail>(`/api/staff-production/${encodeURIComponent(detail.order.reference)}/tailor`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tailor_id: choice ? Number(choice) : null }),
      });
      onChanged(next);
      setMessage(next.order.assigned_tailor ? `Assigned to ${next.order.assigned_tailor.name}.` : "Tailor removed.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not assign the tailor."); } finally { setBusy(false); }
  }

  return <section className="panel production-card-section production-tailor-card" aria-label="Tailor">
    <h2>Tailor</h2>
    {current ? <p className="production-tailor-current"><UserRound size={16} /><strong>{current.name}</strong>{detail.order.assigned_at && <small>since {orderDate(detail.order.assigned_at.slice(0, 10))}</small>}</p> : <p className="consultation-muted">No tailor assigned yet.</p>}
    {detail.can_manage && !closed && <>
      {detail.tailors.length ? <div className="production-assign">
        <label><span className="sr-only">Choose a tailor</span><select value={choice} onChange={(event) => setChoice(event.target.value)} disabled={busy}>
          <option value="">No tailor</option>{detail.tailors.map((tailor) => <option key={tailor.id} value={tailor.id}>{tailor.name}</option>)}
        </select></label>
        <button type="button" className="inventory-quiet-button" disabled={busy || choice === String(current?.id ?? "")} onClick={save}>{busy ? "Saving…" : current ? "Reassign" : "Assign"}</button>
      </div> : <p className="consultation-muted">No tailor accounts yet. The owner can invite tailors from NY Office → Team.</p>}
      {message && <p className="inventory-message" role="status">{message}</p>}
      {error && <p className="collection-error" role="alert">{error}</p>}
    </>}
  </section>;
}

/** When production is done, the production manager can send the order to reception unpackaged; reception packs it. */
function ToReceptionCard({ order, onHanded }: { order: DemoOrder; onHanded?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (order.workflow?.current !== "production_done" || order.workflow.closed || order.reception) return null;
  async function send() {
    setBusy(true); setError("");
    try {
      await productionJson(`/api/staff-production/${encodeURIComponent(order.reference)}/to-reception`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
      onHanded?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not send this order to reception."); setBusy(false); }
  }
  return <section className="panel production-card-section" aria-label="Hand to reception">
    <h2>Packaging</h2>
    <p className="consultation-muted">Package it here with <strong>Mark packaged</strong>, or send it to reception to package.</p>
    {error && <p className="collection-error" role="alert">{error}</p>}
    <button type="button" className="inventory-quiet-button" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send to reception, not packaged"}</button>
  </section>;
}

/** The production manager returns an order to the front desk with what is missing; it leaves production until sent again. */
function SendBackCard({ order, onReturned }: { order: DemoOrder; onReturned?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const workflow = order.workflow;
  const phase = workflow?.steps.find((step) => step.is_current)?.phase;
  if (!workflow || workflow.closed || workflow.current === "packaged" || phase === "Handover") return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await productionJson(`/api/staff-production/${encodeURIComponent(order.reference)}/return`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: new FormData(event.currentTarget).get("reason") }),
      });
      onReturned?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not send this order back."); setBusy(false); }
  }

  return <section className="panel production-card-section production-send-back" aria-label="Send back">
    {!open ? <button type="button" className="inventory-quiet-button" onClick={() => setOpen(true)}>Send back to front desk</button>
      : <form className="order-action-form" onSubmit={submit}>
        <h2>Send back</h2>
        <p className="consultation-muted">The order leaves production until the front desk fixes it and sends it again.</p>
        <label>What needs fixing?<textarea name="reason" required minLength={3} maxLength={1000} rows={3} placeholder="For example: sleeve length is missing from the fitting" disabled={busy} /></label>
        {error && <p className="collection-error" role="alert">{error}</p>}
        <div className="production-send-back-actions"><button type="submit" className="create-bill-button" disabled={busy}>{busy ? "Sending…" : "Send back"}</button><button type="button" className="text-link" onClick={() => setOpen(false)} disabled={busy}>Keep in production</button></div>
      </form>}
  </section>;
}
