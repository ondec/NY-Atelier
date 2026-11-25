"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Circle, Send } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";
import { productionHandoverEndpoint } from "@/lib/studio-endpoints";
import { customerApi, type Profile } from "./customers-workspace";
import { orderDate } from "./order-table";

const when = (value: string) => orderDate(value.slice(0, 10));

/**
 * The front desk completes the production brief (fitting, specifications, approval) and sends the order to
 * NY Production. Until then the production manager doesn't see it; they can send it back with a reason.
 */
export default function OrderProductionHandover({ order, onChange }: { order: DemoOrder; onChange: (order: DemoOrder) => void }) {
  const production = order.production;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fittings, setFittings] = useState<Profile["measurements"]>();
  const needsFitting = order.category === "Custom";
  const preparing = Boolean(production?.can_prepare);

  useEffect(() => {
    if (!preparing || !needsFitting || !order.customer_id) return;
    const controller = new AbortController();
    customerApi<Profile>(`?id=${order.customer_id}`, { signal: controller.signal }).then((profile) => setFittings(profile.measurements)).catch(() => undefined);
    return () => controller.abort();
  }, [preparing, needsFitting, order.customer_id]);

  if (!production) return null;

  if (production.sent_at) return <section className="panel order-detail-section order-production is-sent" aria-label="Production">
    <p><Check size={17} /><span><strong>{order.workflow?.current === "packaged" ? "Back from production · packed" : production.finished ? "Production done" : "In production"}</strong> · sent {when(production.sent_at)}{production.sent_by ? ` by ${production.sent_by}` : ""}</span></p>
  </section>;

  async function call(action: "brief" | "send", data: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const studio = !productionHandoverEndpoint("brief", order.reference).startsWith("/api/staff-orders");
      const response = await fetch(productionHandoverEndpoint(action, order.reference), {
        method: action === "send" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "brief" && !studio ? { reference: order.reference, production: "brief", ...data } : data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Could not save this.");
      onChange(result.order);
      setMessage(action === "send" ? "Sent to production." : "Saved.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this."); } finally { setBusy(false); }
  }

  function saveBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fitting = form.get("fitting");
    void call("brief", { specifications: form.get("specifications"), ...(needsFitting ? { measurement_id: fitting ? Number(fitting) : null } : {}) });
  }

  const checks = [
    ...(needsFitting ? [{ label: "Fitting linked (confirms the measurements)", done: !production.missing.some((item) => item.includes("fitting")) }] : []),
    { label: order.category === "Alterations" ? "Alterations described" : "Specifications written", done: !production.missing.some((item) => item.startsWith("Write") || item.startsWith("Describe")) },
  ];

  return <section className="panel order-detail-section order-production" aria-label="Send to production">
    <div className="order-section-heading"><div><p className="eyebrow">PRODUCTION</p><h2>Not in production yet</h2></div></div>
    {production.return_reason && <p className="order-production-returned" role="note"><strong>Sent back by production{production.returned_at ? ` on ${when(production.returned_at)}` : ""}:</strong> {production.return_reason}</p>}
    <p className="order-journey-help">Sending {order.category === "Alterations" ? "records the assessment" : "approves the design & quotation"} and starts production. The production manager is notified by email and in NY Production.</p>
    <ul className="order-production-checks">{checks.map((check) => <li key={check.label} data-done={check.done}>{check.done ? <Check size={15} /> : <Circle size={12} />}{check.label}</li>)}</ul>
    {preparing && <form className="order-action-form order-production-brief" onSubmit={saveBrief} key={`${order.measurement_id}-${order.specifications}-${fittings ? "ready" : "loading"}`}>
      {needsFitting && <label>Fitting<select name="fitting" defaultValue={order.measurement_id ?? ""} disabled={busy || !fittings}>
        <option value="">{fittings ? fittings.length ? "Choose a fitting" : "No fittings saved for this customer" : "Loading fittings…"}</option>
        {fittings?.map((item, index) => <option key={item.id} value={item.id}>{orderDate(item.measured_on)} · Fitting #{item.id}{index === 0 ? " · Current" : ""}</option>)}
      </select></label>}
      <label>{order.category === "Alterations" ? "Alterations needed" : "Specifications for production"}<textarea name="specifications" rows={4} maxLength={3000} defaultValue={order.specifications ?? ""} placeholder={order.category === "Alterations" ? "What to change on each garment, e.g. shorten sleeves 2cm, take in waist" : "Fabric, cut, lining, buttons, embroidery, anything the tailor must know"} disabled={busy} /></label>
      <button type="submit" className="inventory-quiet-button" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
    </form>}
    {message && <p className="inventory-message" role="status">{message}</p>}
    {error && <p className="collection-error" role="alert">{error}</p>}
    {preparing ? <button type="button" className="create-bill-button" disabled={busy || !production.can_send} onClick={() => void call("send", {})}><Send size={16} />{busy ? "Sending…" : production.return_reason ? "Send back to production" : "Send to production"}</button>
      : <p className="order-journey-help">The front desk or the person who created this order can send it.</p>}
  </section>;
}
