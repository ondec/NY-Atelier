"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, Check, Circle, ClipboardCheck, PackageCheck, X, ArrowUpRight } from "@/components/icons";
import DeliveryMap, { googleMapsLink } from "./delivery-map";
import OrderInspiration from "./order-inspiration";
import OrderProductionHandover from "./order-production-handover";
import OrderAlterationSwitch from "./order-alteration-switch";
import OrderCourier from "./order-courier";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { DemoOrder, OrderNotice } from "@/lib/orders";
import { createRequestId } from "@/lib/request-id";
import { orderAttention, statusTone, type StatusTone } from "@/lib/status";
import StatusBadge from "./status-badge";
import OrderFittingPreview from "./order-fitting-preview";
import { orderDate as date, serviceName } from "./order-table";
import {orderSourceLabel} from '@/lib/order-source';

const eventDate = (value: string) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(new Date(value));
const eventTime = (value: string) => new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" }).format(new Date(value));

function NoticeResult({ notice }: { notice: OrderNotice }) {
  const channel = notice.channel === "sms" ? "SMS" : "Email";
  const label = notice.status === "superseded" ? "External message no longer needed" : notice.status === "submitted" ? `${channel} submitted` : notice.status === "failed" ? `${channel} failed` : notice.status === "not_connected" ? `${channel} not connected` : notice.status === "no_contact" ? "No email or phone" : `${channel} processing`;
  return <span className="order-notice-result"><StatusBadge status="In-app update saved" tone="success" /><StatusBadge status={label} tone={notice.status === "failed" ? "danger" : notice.status === "submitted" ? "success" : notice.status === "superseded" ? "neutral" : "warning"} /></span>;
}

/** Production uses its own endpoints, scoped to custom and alteration orders and to a tailor's assignments. */
export type OrderEndpoints = { update: (reference: string) => string; detail: (reference: string) => string };

export default function OrderDetailsContent({ order: source, showWorkspaceLinks = true, onUpdated, endpoints }: { order: DemoOrder; showWorkspaceLinks?: boolean; onUpdated?: (order: DemoOrder) => void; endpoints?: OrderEndpoints }) {
  const [latest, setLatest] = useState<DemoOrder>();
  const order = latest && (latest.workflow?.version ?? 0) >= (source.workflow?.version ?? 0) ? latest : source;
  const workflow = order.workflow;
  const [mode, setMode] = useState<"advance" | "handover" | "note" | "cancel">("advance");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<StatusTone>("success");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [noteVisible, setNoteVisible] = useState(true);
  const [recheck, setRecheck] = useState<number>();
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const router = useRouter();
  const attention = orderAttention(order);
  const next = workflow?.next;
  const notReady = order.items.filter((item) => !item.is_ready).length;
  const nextBlocked = next?.key === "packaged" && notReady > 0;
  const canManage = Boolean(workflow?.can_manage);
  // NY Production records workroom steps only; the front desk records the rest (the API enforces both).
  const productionDesk = Boolean(endpoints);
  const advanceBlocked = Boolean(next && workflow?.can_advance === false && workflow.advance_blocked);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ block: "nearest" }); }, [error]);

  async function update(data: Record<string, unknown>) {
    if (busy || !workflow) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = { reference: order.reference, version: workflow.version, ...data };
      const fingerprint = JSON.stringify(payload);
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: createRequestId() };
      const response = await fetch(endpoints ? endpoints.update(order.reference) : orderEndpoint("update", order.reference), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, request_id: request.current.id }) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          const fresh = await fetch(endpoints ? endpoints.detail(order.reference) : orderEndpoint("detail", order.reference), { cache: "no-store" }).then((response) => response.json());
          const changed = fresh.order;
          if (changed) { setLatest(changed); onUpdated?.(changed); }
          request.current = null;
        }
        throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Could not save this update.");
      }
      setLatest(result.order); onUpdated?.(result.order); request.current = null;
      setMode("advance"); setRecheck(undefined);
      const sent: OrderNotice | null = result.notification;
      setNoticeTone(!sent || sent.status === "submitted" ? "success" : sent.status === "failed" ? "danger" : "warning");
      setNotice(sent ? sent.status === "superseded" ? "The order has moved on. The earlier update was not resent." : sent.status === "submitted" ? "Order updated. The app update is saved and the message was submitted." : sent.status === "failed" ? "Order updated. The app update is saved; the external message failed. You can retry it." : sent.status === "no_contact" ? "App update saved. Add the customer’s email or phone for external messages." : "App update saved. The external messaging channel still needs connecting." : "Order updated.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this update.");
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? mode;
    void update({ action: action === "advance" ? "advance" : action, stage: next?.key, note: form.get("note"), notify: form.has("notify"), ...(mode === "handover" ? { fulfilment_method: form.get("method"), handover_instructions: form.get("instructions"), courier_name: form.get("courier"), tracking_reference: form.get("tracking") } : {}), ...(mode === "note" ? { client_visible: form.has("visible") } : {}) });
  }

  const fields = [["Service", serviceName(order)], ...(order.service_offering ? [["Service offering", order.service_offering]] : []), ["Order stage", order.status], ["Fulfilment status", order.fulfilment_status ?? "To be agreed"], ["Garments ready", `${order.completed_item_count} of ${order.item_count}`], ...(order.courier_name ? [["Courier", order.courier_name]] : []), ...(order.tracking_reference ? [["Tracking reference", order.tracking_reference]] : [])];
  const steps = workflow?.steps ?? [];
  const history = [...order.timeline].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at) || (b.id ?? 0) - (a.id ?? 0));
  const activityGroups = new Map<string, typeof history>();
  for (const event of history) {
    const day = eventDate(event.occurred_at);
    activityGroups.set(day, [...(activityGroups.get(day) ?? []), event]);
  }

  return <div className="order-details-content" aria-busy={busy}>
    {notice && <p className="inventory-message" data-tone={noticeTone} role={noticeTone === "danger" ? "alert" : "status"}>{notice}</p>}
    {error && <p ref={errorRef} className="collection-error" role="alert">{error}</p>}
    {!endpoints && order.category === "Ready-to-Wear" && !order.is_complete && <OrderAlterationSwitch order={order} onChange={(next) => { setLatest(next); onUpdated?.(next); router.refresh(); }} />}
    {!endpoints && order.production && <OrderProductionHandover order={order} onChange={(next) => { setLatest(next); onUpdated?.(next); router.refresh(); }} />}
    {!endpoints && <OrderCourier order={order} onChange={(next) => { setLatest(next); onUpdated?.(next); router.refresh(); }} />}
    <section className="panel order-detail-section order-summary-section">
      <h2>Order details</h2>
      {attention && <p className="order-detail-note"><StatusBadge status={attention.label} tone={attention.tone} /> {attention.label === "Overdue" ? "Review the expected completion date and update the customer." : order.client_action ?? "This order is expected today."}</p>}
      <dl className="order-summary-facts"><div><dt>Customer</dt><dd>{order.customer_name}</dd></div><div><dt>Order source</dt><dd>{orderSourceLabel(order.source)}</dd></div><div><dt>Expected completion</dt><dd>{date(order.expected_completion_date)}</dd></div><div><dt>Handover</dt><dd>{order.fulfilment_method ?? "Choose collection or delivery"}</dd></div>{order.payment_status !== undefined && <div><dt>Payment</dt><dd><StatusBadge status={order.payment_status ?? "Not recorded"} /></dd></div>}{order.assigned_tailor !== undefined && <div><dt>Tailor</dt><dd>{order.assigned_tailor?.name ?? "Not assigned"}</dd></div>}</dl>
      <div className="order-more-details"><dl className="order-detail-facts">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label.includes("stage") || label.includes("status") ? <StatusBadge status={value} /> : value}</dd></div>)}</dl>
        {showWorkspaceLinks && order.consultation_id && <p className="order-detail-note"><Link prefetch={false} className="text-link" href={`/?section=appointments&consultation=${encodeURIComponent(order.consultation_id)}`}>View linked consultation <ArrowRight size={16} /></Link></p>}
        {order.date_change_explanation && <p className="order-detail-note">{order.date_change_explanation}</p>}
        {order.handover_instructions && <p className="order-detail-note"><strong>Handover instructions</strong><br />{order.handover_instructions}</p>}
      </div>
      {order.specifications && <div className="order-specifications"><h3>Specifications</h3><p>{order.specifications}</p></div>}
      {order.attachments && <OrderInspiration key={order.reference} reference={order.reference} attachments={order.attachments} canEdit={(canManage || Boolean(order.production?.can_prepare)) && !workflow?.closed} onChange={(attachments) => { const next = { ...order, attachments }; setLatest(next); onUpdated?.(next); }} />}
      {order.delivery && <DeliveryDetails delivery={order.delivery} />}
      {!endpoints && order.measurement_id && order.customer_id && <OrderFittingPreview key={`${order.customer_id}-${order.measurement_id}`} customerId={order.customer_id} fittingId={order.measurement_id} showWorkspaceLinks={showWorkspaceLinks} />}
    </section>

    {workflow && <section className="panel order-detail-section order-journey-section">
      <div className="order-section-heading"><div><p className="eyebrow">ORDER JOURNEY</p><h2>Progress & handover</h2></div><StatusBadge status={order.status} /></div>
      <div className="order-journey-layout"><div className="order-route">
        <div className="order-route-heading"><h3>{order.category === "Custom" ? "Bespoke" : serviceName(order)} · {order.fulfilment_method ?? "Handover to be agreed"}</h3></div>
        {workflow.legacy && <p className="order-journey-help">Earlier steps without a saved update are shown as unrecorded. No dates have been assumed.</p>}
        <ol className="order-milestones">{steps.map((step) => <li key={step.key} data-current={step.is_current} data-tone={step.is_current ? statusTone(order.status) : step.state === "recorded" ? "success" : "neutral"}>
          <span className="order-milestone-icon">{step.state === "recorded" ? <Check size={15} /> : step.state === "skipped" ? <X size={14} /> : <Circle size={12} />}</span>
          <div><div className="order-milestone-title"><strong>{step.label}</strong>{step.is_current && <small>Current</small>}{step.key === next?.key && <small>Next</small>}</div><p>{step.help}</p><small>{step.recorded_at ? `${step.state === "skipped" ? "Not required · " : ""}${eventDate(step.recorded_at)} · ${eventTime(step.recorded_at)}` : step.state === "unrecorded" ? "No recorded update" : "Not yet reached"}</small></div>
        </li>)}</ol>
        {workflow.current === "cancelled" && <StatusBadge status="Cancelled" />}
      </div>
      {canManage && <aside className="order-next-action" aria-label="Order actions">
        <p className="eyebrow">{mode === "advance" ? workflow.current === "cancelled" ? "ORDER CANCELLED" : workflow.closed ? "ORDER COMPLETE" : "NEXT ACTION" : mode === "handover" ? "HANDOVER ARRANGEMENTS" : mode === "cancel" ? "CANCEL ORDER" : "RECORD AN UPDATE"}</p>
        {mode === "advance" && <><h3>{next?.label ?? (workflow.closed ? order.status : "Choose collection or delivery")}</h3><p className="order-journey-help">{next?.help ?? (workflow.closed ? "The order journey is closed. Its history remains available below." : "Set the handover method so the remaining steps match the customer’s arrangement.")}</p></>}
        {mode === "advance" && advanceBlocked && <p className="order-journey-help order-advance-blocked">{workflow.advance_blocked}</p>}
        {(mode !== "advance" || (next && !advanceBlocked)) && <form key={`${mode}-${next?.key}-${order.reference}`} onSubmit={submit} className="order-action-form">
          {mode === "handover" && <><label>Handover method<select name="method" defaultValue={order.fulfilment_method ?? ""} required disabled={!workflow.can_change_method}><option value="" disabled>Choose method</option><option>Collection</option><option>Delivery</option></select></label>{!workflow.can_change_method && <input type="hidden" name="method" value={order.fulfilment_method ?? ""} />}
            <label>Collection / delivery instructions<textarea name="instructions" rows={2} maxLength={1000} defaultValue={order.handover_instructions ?? ""} placeholder="Collection point, delivery address or agreed instructions" /></label>
            <label>Courier name <small>(delivery only)</small><input name="courier" maxLength={150} defaultValue={order.courier_name ?? ""} /></label><label>Tracking reference <small>(optional)</small><input name="tracking" maxLength={150} defaultValue={order.tracking_reference ?? ""} /></label></>}
          <label>{mode === "cancel" ? "Reason for cancellation" : next?.note_required && mode === "advance" ? "Recipient & handover confirmation" : "Update note"}<textarea name="note" rows={3} maxLength={1000} required={mode === "cancel" || mode === "note" || (mode === "advance" && next?.note_required) || (mode === "handover" && Boolean(order.fulfilment_method))} placeholder={next?.note_required && mode === "advance" ? "Who received the order, where and any confirmation details" : "Add useful context for this update"} /></label>
          {mode === "note" && <label className="order-action-check"><input name="visible" type="checkbox" checked={noteVisible} onChange={(event) => setNoteVisible(event.target.checked)} /> Show this note to the customer</label>}
          {mode === "advance" && next?.notify ? <p className="order-journey-help">The customer is notified in the app and by email (SMS if no email).</p>
            : mode !== "handover" && <label className="order-action-check"><input name="notify" type="checkbox" disabled={mode === "note" && !noteVisible} /> Notify client in app + email, or SMS if no email</label>}
          {mode === "advance" && <p className="order-journey-help">This update appears in the customer’s order timeline. Use Add note for an internal workshop note.</p>}
          {mode === "note" && !noteVisible && <p className="order-journey-help">Internal notes are never sent to the customer.</p>}
          {nextBlocked && mode === "advance" && <p className="order-journey-help">{notReady} {notReady === 1 ? "garment still needs" : "garments still need"} final checks. Mark each garment ready below before packaging.</p>}
          <button className={mode === "cancel" ? "order-cancel-button" : "create-bill-button"} type="submit" value={mode} disabled={busy || (mode === "advance" && nextBlocked)}>{busy ? "Saving…" : mode === "advance" ? next?.action : mode === "handover" ? "Save handover" : mode === "cancel" ? "Confirm cancellation" : "Save note"}</button>
          {mode === "advance" && next?.optional && <button className="inventory-quiet-button" type="submit" value="skip" disabled={busy}>Fitting not required · record why</button>}
        </form>}
        {mode === "advance" && !next && !workflow.closed && !productionDesk && <button className="create-bill-button" type="button" onClick={() => setMode("handover")}>Set handover method</button>}
        <div className="order-secondary-actions">{mode !== "advance" && <button type="button" className="inventory-quiet-button" onClick={() => setMode("advance")}>Back to next action</button>}{mode !== "note" && <button type="button" className="inventory-quiet-button" onClick={() => setMode("note")}>Add note</button>}{!productionDesk && workflow.can_edit_handover && mode !== "handover" && <button type="button" className="inventory-quiet-button" onClick={() => setMode("handover")}>Edit handover</button>}{!productionDesk && workflow.can_cancel && mode !== "cancel" && <button type="button" className="order-cancel-link" onClick={() => setMode("cancel")}>Cancel order</button>}</div>
        {!productionDesk && <div className="order-client-notice"><h4><Bell size={15} /> Customer update</h4><p className="order-journey-help">Saved in the app, plus email. SMS is used when no email is recorded.</p>{workflow.current_notification && <NoticeResult notice={workflow.current_notification} />}<button className="inventory-quiet-button" type="button" disabled={busy || Boolean(workflow.current_notification && ["submitted", "submitting"].includes(workflow.current_notification.status ?? ""))} onClick={() => void update({ action: "notify" })}><Bell size={15} />{workflow.current_notification?.status === "failed" ? "Retry external message" : workflow.current_notification ? "Refresh notification delivery" : "Notify client"}</button></div>}
      </aside>}
      </div>
    </section>}

    <section className="panel order-detail-section">
      <div className="order-section-heading"><div><p className="eyebrow">GARMENT CHECKS</p><h2>Garments</h2></div><span className="order-ready-count"><PackageCheck size={16} />{order.completed_item_count} of {order.item_count} ready</span></div>
      {order.items.length ? <div className="table-wrap"><table className="order-table order-garment-table"><thead><tr><th>Garment / wearer</th><th>Stage</th><th>Expected</th>{workflow?.can_mark_items && <th>Final checks</th>}</tr></thead><tbody>{order.items.map((item, index) => <tr key={item.id ?? index}><th scope="row">{item.garment_name}{item.wearer_name && <small className="order-wearer">{item.wearer_name}</small>}</th><td><StatusBadge status={item.status} /></td><td>{date(item.expected_completion_date)}</td>{workflow?.can_mark_items && <td>{item.is_ready ? <button type="button" className="text-link" disabled={busy} onClick={() => setRecheck(item.id)}>Reopen checks</button> : <button className="inventory-quiet-button" type="button" disabled={busy || !item.id} onClick={() => void update({ action: "item_ready", item_id: item.id, ready: true })}><ClipboardCheck size={15} /> Mark ready</button>}</td>}</tr>)}</tbody></table></div> : <p>No garments recorded.</p>}
      {recheck && <form className="order-recheck-form order-action-form" onSubmit={(event) => { event.preventDefault(); void update({ action: "item_ready", item_id: recheck, ready: false, note: new FormData(event.currentTarget).get("note") }); }}><label>What needs further work?<textarea name="note" required maxLength={1000} rows={2} /></label><button className="inventory-quiet-button" disabled={busy}>Reopen garment checks</button><button className="text-link" type="button" onClick={() => setRecheck(undefined)}>Keep ready</button></form>}
    </section>

    <section className="panel order-detail-section order-activity-section">
      <div className="order-section-heading"><div><p className="eyebrow">SAVED UPDATES</p><h2>Order timeline</h2></div><span className="order-journey-help">Latest first · Accra time</span></div>
      {history.length ? Array.from(activityGroups, ([day, events]) => <div className="order-activity-day" key={day}><h3>{day}</h3><ol className="order-activity-list">{events.map((event, index) => <li key={event.id ?? `${event.occurred_at}-${index}`}><time dateTime={event.occurred_at} aria-label={`${eventDate(event.occurred_at)} ${eventTime(event.occurred_at)}`}><strong>{eventTime(event.occurred_at)}</strong></time><span className="order-activity-marker" data-tone={statusTone(event.title)}><Circle size={9} fill="currentColor" /></span><div className="order-activity-body"><div className="order-activity-title">{statusTone(event.title) === "neutral" ? <strong>{event.title}</strong> : <StatusBadge status={event.title} />}{event.client_visible === false && <StatusBadge status="Internal note" tone="neutral" />}</div>{event.explanation && <p>{event.explanation}</p>}{event.notification && <NoticeResult notice={event.notification} />}</div></li>)}</ol></div>) : <p className="order-journey-help">No saved updates yet. Milestones appear here as the team records them.</p>}
    </section>
  </div>;
}

function DeliveryDetails({ delivery }: { delivery: NonNullable<DemoOrder["delivery"]> }) {
  const pin = delivery.latitude !== null && delivery.longitude !== null ? { latitude: delivery.latitude, longitude: delivery.longitude } : undefined;
  const place = [delivery.address, delivery.area].filter(Boolean).join(", ");
  const mapsHref = pin ? googleMapsLink(pin) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Ghana`)}`;
  return <div className="order-delivery">
    <h3>Delivery details</h3>
    <dl className="order-summary-facts">
      <div className="order-delivery-wide"><dt>Address</dt><dd>{place}</dd></div>
      {delivery.recipient_name && <div><dt>Recipient</dt><dd>{delivery.recipient_name}</dd></div>}
      {delivery.phone && <div><dt>Phone</dt><dd><a className="text-link" href={`tel:${delivery.phone.replace(/[^0-9+]/g, "")}`}>{delivery.phone}</a></dd></div>}
      {delivery.gps_code && <div><dt>GhanaPost GPS</dt><dd>{delivery.gps_code}</dd></div>}
      {delivery.directions && <div className="order-delivery-wide"><dt>Directions</dt><dd>{delivery.directions}</dd></div>}
    </dl>
    {pin && <DeliveryMap readOnly pin={pin} />}
    <a className="text-link" href={mapsHref} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowUpRight size={16} /></a>
  </div>;
}
