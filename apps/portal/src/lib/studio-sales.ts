import { variantKey, type Inventory, type Product, type Variant } from './inventory';
/** `alteration` set (even empty) means the piece needs adjusting; the note says what, for production. */
export type SaleLine = { variantId: string; quantity: number; alteration?: string };
export const saleNeedsAlteration = (lines: SaleLine[]) => lines.some((line) => line.alteration !== undefined);
export const alterationNotesReady = (lines: SaleLine[]) => lines.every((line) => line.alteration === undefined || line.alteration.trim().length >= 3);
export type SaleItem = { variantId:string; name:string; colour:string; fabric:string; size:string; sku:string; quantity:number; unit_minor:number; total_minor:number; photo?:string|null };
export type SaleQuote = {lines:SaleItem[];total_minor:number;currency:'GHS';revision:number};
export type Receipt = SaleQuote & {staff?:{id:number;name:string;role:string};id:string;reference:string;customer:{id:number;name:string};payment_method:string;payment_reference:string|null;tendered_minor:number;change_minor:number;handover:string;instructions?:string;paid_at:string;status:string;alteration?:string|null};
export type Checkout = {request_id:string; customer_id:number;lines:SaleLine[];revision:number;total_minor:number;payment_method:string;payment_reference?:string;tendered_minor?:number;payment_confirmed:boolean;handover:string;handover_confirmed:boolean;instructions?:string};
export const paymentMethods = [{id:'cash',label:'Cash'},{id:'mobile-money',label:'Mobile money'},{id:'card',label:'Card terminal'},{id:'bank-transfer',label:'Bank transfer'}] as const;
export const saleMoney = (minor:number) => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS',maximumFractionDigits:2}).format(minor/100);
export function amountToMinor(value:string):number|null { if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(value.trim()))return null;const [whole,fraction='']=value.trim().split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0')); }
export function salePhoto(inventory:Inventory,product:Product,variant:Variant):string|undefined {const visual=inventory.visuals?.[variantKey(variant)];return visual?.gallery?.[0]??visual?.photo??product.gallery?.[0]??product.photo;}
export async function salesApi<T>(path:string,body?:unknown):Promise<T> {
  const response=await fetch(`/api/studio/sales${path}`,{method:body===undefined?'GET':'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message??'Could not load the sale.'),{status:response.status});return data;
}
