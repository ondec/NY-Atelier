"use client";

import Image from "next/image";
import { Minus, Plus, Scissors, ShoppingBag, Trash2, UserRound } from "@/components/icons";
import { alterationNotesReady, salePhoto, saleNeedsAlteration, type SaleLine } from "@/lib/studio-sales";
import { variantLabel, type Inventory } from "@/lib/inventory";

export type { SaleLine } from "@/lib/studio-sales";
export const saleMoney = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(amount);

export default function SaleBasket({ inventory, lines, customer, customerId, onCustomer, onQuantity, onAlteration, onCheckout }: {
  inventory: Inventory; lines: SaleLine[]; customer?: string; customerId?: number;
  onCheckout: () => void;
  /** `undefined` clears the alteration; a string (possibly empty) marks the piece as needing one. */
  onAlteration: (id: string, alteration: string | undefined) => void;
  onCustomer: () => void; onQuantity: (id: string, quantity: number) => void;
}) {
  const rows = lines.map((line) => {
    const variant = inventory.variants.find((item) => item.id === line.variantId);
    const product = inventory.products.find((item) => item.id === variant?.productId);
    return { ...line, variant, product, photo: variant && product ? salePhoto(inventory, product, variant) : undefined };
  });
  const total = rows.reduce((sum, row) => sum + (row.product?.price ?? 0) * row.quantity, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  return <aside className="showroom-sale" aria-label="Current sale">
    <div className="showroom-sale-heading"><div><p className="showroom-kicker">THE SALE DESK</p><h2>Current sale</h2></div><span className="showroom-sale-count">{count}</span></div>
    <button className="showroom-sale-customer" onClick={onCustomer}><UserRound size={18} /><span>{customer ?? "Select customer"}</span><Plus size={16} /></button>
    <p className="showroom-sale-customer-help">Choose the customer and review the items before payment.</p>
    {!rows.length ? <div className="showroom-sale-empty"><ShoppingBag size={35} /><h3>A new sale starts here.</h3><p>Tap a garment, choose its colour and size, then add it to this sale.</p></div> : <div className="showroom-sale-lines">{rows.map((row) => <article key={row.variantId}>
      <div className="showroom-sale-item">{row.photo && <Image src={row.photo} alt={[row.product?.name,row.variant?.colour,row.variant?.fabric].filter(Boolean).join(" · ")} width={48} height={64} unoptimized />}<div><strong>{row.product?.name ?? "Unavailable garment"}</strong><small>{row.variant ? `${variantLabel(row.variant)} · ${row.variant.size}` : "This variant is no longer available"}</small><span>{saleMoney(row.product?.price ?? 0)} each</span></div><button aria-label={`Remove ${row.product?.name ?? "item"} ${row.variant ? variantLabel(row.variant) : ""} ${row.variant?.size ?? ""}`} onClick={() => onQuantity(row.variantId, 0)}><Trash2 size={16} /></button></div>
      <div className="showroom-sale-quantity"><div><button aria-label={`Decrease quantity of ${row.product?.name} ${row.variant ? variantLabel(row.variant) : ""} ${row.variant?.size}`} onClick={() => onQuantity(row.variantId, row.quantity - 1)}><Minus size={16} /></button><span aria-label="Quantity">{row.quantity}</span><button aria-label={`Increase quantity of ${row.product?.name} ${row.variant ? variantLabel(row.variant) : ""} ${row.variant?.size}`} disabled={!row.variant || !row.product || row.quantity >= row.variant.quantity} onClick={() => onQuantity(row.variantId, row.quantity + 1)}><Plus size={16} /></button></div><strong>{saleMoney((row.product?.price ?? 0) * row.quantity)}</strong></div>
      {row.product && row.variant && <div className="showroom-sale-alteration">
        <label className="showroom-sale-alteration-toggle"><input type="checkbox" checked={row.alteration !== undefined} onChange={(event) => onAlteration(row.variantId, event.target.checked ? "" : undefined)} /><Scissors size={15} />Needs alteration</label>
        {row.alteration !== undefined && <label className="showroom-sale-alteration-note"><span className="sr-only">Alteration for {row.product.name}</span><textarea rows={2} maxLength={1000} value={row.alteration} placeholder="What to change, e.g. shorten sleeves 2cm" onChange={(event) => onAlteration(row.variantId, event.target.value)} /></label>}
      </div>}
      {(!row.variant || !row.product || row.quantity > row.variant.quantity) && <p className="collection-error" role="alert">Stock changed. Review this item before completing the sale.</p>}
    </article>)}</div>}
    <div className="showroom-sale-total"><span>{count} {count === 1 ? "item" : "items"}</span><div><span>Subtotal</span><strong>{saleMoney(total)}</strong></div>{rows.length > 0 && <button type="button" className="showroom-primary studio-checkout-button" disabled={!customerId || !alterationNotesReady(lines) || rows.some(row=>!row.variant || !row.product || row.quantity>row.variant.quantity)} onClick={onCheckout}>Continue to payment</button>}{rows.length > 0 && !customerId && <p className="showroom-hint">Select a customer to continue.</p>}{rows.length > 0 && !alterationNotesReady(lines) && <p className="showroom-hint">Describe each alteration to continue.</p>}{saleNeedsAlteration(lines) && <p className="showroom-hint">After payment this sale becomes an alteration and goes to production. The customer collects everything once it is ready.</p>}</div>
  </aside>;
}
