"use client";
import Image from "next/image";
import { Check, Download } from "@/components/icons";
import { paymentMethods, saleMoney, type Receipt } from "@/lib/studio-sales";
export default function StudioReceipt({ receipt, onNewSale }: {receipt:Receipt;onNewSale?:()=>void}) {
  return <section className="studio-receipt" aria-label="Sale receipt">
    <header><Image src="/ny-mark.svg" alt="NY Atelier" width={45} height={45}/><span>NY ATELIER<small>NY Studio · Sales receipt</small></span><span className="studio-receipt-paid"><Check size={15}/>Paid</span></header>
    <h2>Sale complete.</h2><p className="studio-receipt-reference">{receipt.reference}</p>
    <dl><div><dt>Customer</dt><dd>{receipt.customer.name}</dd></div><div><dt>Date</dt><dd>{new Date(receipt.paid_at).toLocaleString('en-GH',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Accra'})}</dd></div><div><dt>Payment</dt><dd>{paymentMethods.find(method=>method.id===receipt.payment_method)?.label}</dd></div>{receipt.payment_reference&&<div><dt>Transaction reference</dt><dd>{receipt.payment_reference}</dd></div>}{receipt.staff&&<div><dt>Served by</dt><dd>{receipt.staff.name}</dd></div>}<div><dt>Handover</dt><dd>{receipt.alteration?(receipt.handover==='delivery'?'Delivery after the alteration':'Collection after the alteration'):receipt.handover==='take-away'?'Collected at NY Studio':receipt.handover==='delivery'?'Delivery to be arranged':'Collection to be arranged'}</dd></div></dl>
    {receipt.lines.map(line=><div className="studio-receipt-line" key={line.variantId}>{line.photo&&<Image src={line.photo} alt={[line.name,line.colour,line.fabric].filter(Boolean).join(" · ")} width={45} height={60} unoptimized/>}<div><strong>{line.name}</strong><small>{[line.colour,line.fabric,`Size ${line.size}`].filter(Boolean).join(' · ')}</small><small>{line.quantity} × {saleMoney(line.unit_minor)} · {line.sku}</small></div><strong>{saleMoney(line.total_minor)}</strong></div>)}
    <dl className="studio-receipt-total"><div><dt>Total paid</dt><dd>{saleMoney(receipt.total_minor)}</dd></div>{receipt.payment_method==='cash'&&<><div><dt>Cash received</dt><dd>{saleMoney(receipt.tendered_minor)}</dd></div><div><dt>Change</dt><dd>{saleMoney(receipt.change_minor)}</dd></div></>}</dl>
    {receipt.alteration&&<div className="studio-receipt-alteration"><strong>Alteration · going to production</strong><p>{receipt.alteration}</p></div>}
    {receipt.instructions&&<p>{receipt.instructions}</p>}
    <div className="studio-receipt-actions"><button type="button" className="showroom-secondary" onClick={()=>window.print()}><Download size={16}/>Print receipt</button>{onNewSale&&<button type="button" className="showroom-primary" onClick={onNewSale}>New sale</button>}</div>
  </section>;
}
