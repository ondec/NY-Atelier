"use client";
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, X } from '@/components/icons';
import { amountToMinor, paymentMethods, saleMoney, salesApi, type Checkout, type Receipt, type SaleLine, type SaleQuote } from '@/lib/studio-sales';
import { createRequestId } from '@/lib/request-id';
import { InventoryDrawer } from '../catalogue-editor';
const pendingCheckoutKey=(staffId:number)=>`ny-studio-pending-checkout-v1:${staffId}`;
export function readPendingCheckout(staffId:number):Checkout|undefined {try {const data=JSON.parse(localStorage.getItem(pendingCheckoutKey(staffId))??'null');if(data&&typeof data.request_id==='string'&&Array.isArray(data.lines)&&Number.isInteger(data.customer_id))return data;}catch{}return undefined;}
export default function StudioCheckout({staffId,lines,customerId,customer,onClose,onComplete}:{staffId:number;lines:SaleLine[];customerId:number;customer?:string;onClose:()=>void;onComplete:(receipt:Receipt)=>void}) {
  const [quote,setQuote]=useState<SaleQuote>();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [pending,setPending]=useState<Checkout>();const [revision,setRevision]=useState(0);
  const [method,setMethod]=useState('cash');const [cash,setCash]=useState('');const [handover,setHandover]=useState('collection');
  const signature=JSON.stringify(lines);
  useEffect(()=>{
    if(!busy&&!pending)return;
    const preventLeaving=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',preventLeaving);
    return()=>window.removeEventListener('beforeunload',preventLeaving);
  },[busy,pending]);
  useEffect(()=>{
    let active=true;
    async function load(){
      const saved=readPendingCheckout(staffId);
      if(saved){setPending(saved);try{const data=await salesApi<{receipt:Receipt}>(`/${saved.request_id}`);if(active){if(readPendingCheckout(staffId)?.request_id===data.receipt.id)localStorage.removeItem(pendingCheckoutKey(staffId));onComplete(data.receipt);}}catch{if(active)setError('This checkout has not been confirmed yet. Retry confirmation before starting another sale. Do not collect the payment again.');}return;}
      setQuote(undefined);setError('');
      try {const data=await salesApi<SaleQuote>('/quote',{customer_id:customerId,lines:JSON.parse(signature)});if(active)setQuote(data);}catch(failure){if(active)setError(failure instanceof Error?failure.message:'Could not check stock.');}
    }
    void load();return()=>{active=false;};
  // The completion callback belongs to this checkout session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[signature,customerId,revision,staffId]);
  async function record(payload:Checkout){
    const saved=readPendingCheckout(staffId);
    if(saved&&saved.request_id!==payload.request_id){setPending(saved);setError('Another checkout is awaiting confirmation. Confirm it before starting this sale.');return;}
    setBusy(true);setError('');
    try {localStorage.setItem(pendingCheckoutKey(staffId),JSON.stringify(payload));}
    catch {setBusy(false);setError('This browser cannot save the checkout confirmation. Allow site storage before recording payment. Keep this sale open and do not collect payment again.');return;}
    setPending(payload);
    try{const data=await salesApi<{receipt:Receipt}>('',payload);if(readPendingCheckout(staffId)?.request_id===data.receipt.id)localStorage.removeItem(pendingCheckoutKey(staffId));onComplete(data.receipt);}
    catch(failure){const status=(failure as {status?:number}).status;if(status&&status>=400&&status<500){if(readPendingCheckout(staffId)?.request_id===payload.request_id)localStorage.removeItem(pendingCheckoutKey(staffId));setPending(undefined);setQuote(undefined);}setError(failure instanceof Error?failure.message:'Confirmation is unavailable. Retry this checkout without collecting payment again.');}
    finally{setBusy(false);}
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!quote||busy||pending)return;const data=new FormData(event.currentTarget);const tendered=amountToMinor(cash);if(method==='cash'&&(tendered===null||tendered<quote.total_minor)){setError('Cash received must cover the total.');return;}
    void record({request_id:createRequestId(),customer_id:customerId,lines,revision:quote.revision,total_minor:quote.total_minor,payment_method:method,payment_reference:method==='cash'?undefined:String(data.get('reference')??'').trim(),tendered_minor:method==='cash'?tendered!:undefined,payment_confirmed:data.has('confirmed'),handover,handover_confirmed:data.has('handed-over'),instructions:String(data.get('instructions')??'').trim()||undefined});
  }
  const tendered=amountToMinor(cash);
  return <InventoryDrawer label="Complete sale" dismissible={!busy&&!pending} onClose={()=>{if(!busy&&!pending)onClose();}}><section className="studio-checkout">
    <header className="inventory-form-title"><div><p className="showroom-kicker">PAYMENT & HANDOVER</p><h2>Complete sale.</h2><p>{customer}</p></div><button type="button" aria-label="Close checkout" disabled={busy||Boolean(pending)} onClick={onClose}><X size={20}/></button></header>
    {pending?<div className="studio-checkout-retry"><h3>Confirm this checkout</h3><p role={error?"alert":"status"}>{error||'Checking the saved receipt…'}</p><button type="button" className="showroom-primary" disabled={busy} onClick={()=>void record(pending)}>{busy?'Confirming…':'Retry confirmation'}</button></div>:!quote?<><p role={error?'alert':'status'}>{error||'Checking prices and available stock…'}</p>{error&&<button className="showroom-secondary" onClick={()=>setRevision(value=>value+1)}>Review sale again</button>}</>:<form onSubmit={submit}>
      <div className="studio-checkout-items">{quote.lines.map(line=><div className="studio-receipt-line" key={line.variantId}>{line.photo&&<Image src={line.photo} alt={[line.name,line.colour,line.fabric].filter(Boolean).join(" · ")} width={44} height={60} unoptimized/>}<div><strong>{line.name}</strong><small>{[line.colour,line.fabric,`Size ${line.size}`,`Qty ${line.quantity}`].filter(Boolean).join(' · ')}</small></div><strong>{saleMoney(line.total_minor)}</strong></div>)}</div>
      <div className="studio-checkout-total"><span>Total due</span><strong>{saleMoney(quote.total_minor)}</strong></div>
      <fieldset className="studio-payment-methods"><legend>Payment method</legend>{paymentMethods.map(item=><label key={item.id} data-selected={method===item.id}><input type="radio" name="method" value={item.id} checked={method===item.id} onChange={()=>setMethod(item.id)}/>{item.label}{method===item.id&&<Check size={15}/>}</label>)}</fieldset>
      {method==='cash'?<><label className="studio-checkout-field">Cash received (GHS)<input value={cash} onChange={event=>setCash(event.target.value)} inputMode="decimal" placeholder="0.00" required/></label><div className="studio-checkout-change"><span>Change due</span><strong>{tendered!==null&&tendered>=quote.total_minor?saleMoney(tendered-quote.total_minor):'—'}</strong></div></>:<><label className="studio-checkout-field">Transaction reference<input key={method} name="reference" required minLength={3} maxLength={100} autoComplete="off" placeholder={method==='mobile-money'?'Merchant transaction ID':'Approved payment reference'}/></label><p className="showroom-hint">{method==='mobile-money'?'Confirm the transfer in the merchant account before completing the sale.':'Record an approved payment from your terminal or bank account.'}</p></>}
      <label className="studio-checkout-confirm"><input key={method} type="checkbox" name="confirmed" required/>{method==='cash'?'I confirm the cash has been received.':'I confirm payment is received and verified.'}</label>
      <label className="studio-checkout-field">Handover<select value={handover} onChange={event=>setHandover(event.target.value)}><option value="collection">Collect later</option><option value="take-away">Take away now</option><option value="delivery">Arrange delivery</option></select></label>
      {handover==='take-away'&&<label className="studio-checkout-confirm"><input type="checkbox" name="handed-over" required/>The garments have been checked and handed to the customer.</label>}
      <label className="studio-checkout-field">{handover==='delivery'?'Delivery address & instructions':'Handover notes (optional)'}<textarea name="instructions" key={handover} rows={3} required={handover==='delivery'} maxLength={1000}/></label>
      {error&&<p className="collection-error" role="alert">{error}</p>}
      <div className="studio-checkout-actions"><button type="button" className="showroom-secondary" disabled={busy} onClick={onClose}><ArrowLeft size={16}/>Back to sale</button><button type="submit" className="showroom-primary" disabled={busy}>{busy?'Recording…':'Record payment & complete sale'}</button></div>
    </form>}
  </section></InventoryDrawer>;
}
