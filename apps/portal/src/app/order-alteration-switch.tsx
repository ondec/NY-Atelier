"use client";

import { useState, type FormEvent } from "react";
import { Scissors } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";

/**
 * A Ready-to-Wear purchase that needs adjusting becomes an alteration and follows the Alterations journey
 * (send to production, In production, Production done, Packaged, handover). Its sale stays recorded as Ready-to-Wear.
 */
export default function OrderAlterationSwitch({ order, onChange }: { order: DemoOrder; onChange: (order: DemoOrder) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const outForHandover = ["ready_collection", "out_for_delivery"].includes(order.workflow?.current ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/staff-orders?reference=${encodeURIComponent(order.reference)}&production=alteration`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specifications: new FormData(event.currentTarget).get("specifications") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Object.values(result.errors ?? {}).flat().join(" ") || result.message || "Could not change this order.");
      onChange(result.order);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not change this order."); } finally { setBusy(false); }
  }

  if (outForHandover) return null;

  return <section className="panel order-detail-section order-production" aria-label="Needs an alteration">
    <div className="order-section-heading"><div><p className="eyebrow">ALTERATION</p><h2>Needs adjusting?</h2></div></div>
    <p className="order-journey-help">Turn this purchase into an alteration. It then goes to production like any alteration. The sale and stock stay recorded as Ready-to-Wear.</p>
    {open ? <form className="order-action-form order-production-brief" onSubmit={submit}>
      <label>Alterations needed<textarea name="specifications" rows={3} required minLength={3} maxLength={3000} placeholder="What to change on each garment, e.g. shorten sleeves 2cm, take in waist" disabled={busy} /></label>
      {error && <p className="collection-error" role="alert">{error}</p>}
      <div className="order-secondary-actions">
        <button type="submit" className="create-bill-button" disabled={busy}><Scissors size={16} />{busy ? "Saving…" : "Make it an alteration"}</button>
        <button type="button" className="inventory-quiet-button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form> : <button type="button" className="inventory-quiet-button" onClick={() => setOpen(true)}><Scissors size={16} />Needs an alteration</button>}
  </section>;
}
