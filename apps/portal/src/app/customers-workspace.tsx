"use client";

import { customerEndpoint } from "@/lib/studio-endpoints";

import StatusBadge from "./status-badge";

import { createRequestId } from "@/lib/request-id";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, X } from "@/components/icons";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { InventoryDrawer } from "./catalogue-editor";
import { orderDate, orderHref } from "./order-table";
import FittingReadings from './fitting-readings';
import FittingFields, {FittingMedia} from './fitting-fields';
import {fittingFormValues, type AdditionalMeasurement, type FittingAttachment, type MeasurementUnit} from '@/lib/fitting-measurements';

export type Customer = { id: number; name: string; email: string | null; phone: string | null; account_reference: string | null };
export type MeasurementTemplate = { name: string; description: string; groups: { title: string; fields: string[] }[] };
export type Fitting = { garment_type?: string | null; id: number; measured_on: string; values: Record<string, number>; notes: string | null; unit?: 'cm'; recorded_unit?: MeasurementUnit; additional_measurements?: AdditionalMeasurement[]; attachments?: FittingAttachment[] };
export type Directory = { customers: Customer[]; fields: Record<string, string>; templates?: Record<string, MeasurementTemplate> };
export type Profile = {
  customer: Customer;
  measurements: Fitting[];
  orders: { reference: string; category: string; status: string; measurement_id: number | null }[];
};

export async function customerApi<T>(query = "", init?: RequestInit): Promise<T> {
  const response = await fetch(customerEndpoint(query), {
    ...init, cache: "no-store", headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Could not load customer records.");
  return payload;
}

export default function CustomersWorkspace({ customerId, fittingId }: { customerId?: number; fittingId?: number }) {
  const router = useRouter();
  const [directory, setDirectory] = useState<Directory>();
  const [profile, setProfile] = useState<Profile>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<"customer" | "fitting">();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    customerApi<Directory>("", { signal: controller.signal }).then(setDirectory).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    if (customerId) {
      customerApi<Profile>(`?id=${customerId}`, { signal: controller.signal }).then(setProfile).catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    }
    return () => controller.abort();
  }, [customerId, revision]);

  const customer = profile?.customer;
  const current = profile?.measurements[0];
  const needle = query.trim().toLowerCase();
  const results = directory?.customers.filter((row) =>
    [row.name, row.email, row.phone, row.account_reference].some((value) => value?.toLowerCase().includes(needle))
  ) ?? [];

  return <>
    <div className="eyebrow">CUSTOMER WORKSPACE</div>
    {customerId && <Link className="text-link inventory-back" href="/?section=customers"><ArrowLeft size={14} /> Back to customers</Link>}
    <div className="page-heading">
      <div><h1>{customer?.name ?? (customerId ? "Customer profile" : "Customers.")}</h1><p>{customerId ? "Contact details, fittings and linked orders." : "Keep client details and dated fitting records together."}</p></div>
      {!customerId && directory && <button className="create-bill-button" type="button" onClick={() => setEditor("customer")}><Plus size={16} /> Add customer</button>}
      {customer && <button className="inventory-quiet-button" type="button" onClick={() => setEditor("customer")}>Edit profile</button>}
    </div>
    {error && <p className="inventory-message" role="alert">{error}</p>}
    {!error && (!directory || (customerId && !profile)) && <p role="status">Loading customer records…</p>}
    {directory && !customerId && <section className="panel inventory-list-panel">
      <div className="panel-heading"><h2>Customer directory <span className="heading-count">{results.length}</span></h2>
        <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search customers</span><input type="search" placeholder="Name, email, phone or account ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {results.length ? <div className="table-wrap"><table className="order-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Account reference</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {results.map((row) => {
          const profileHref = `/?section=customers&customer=${row.id}`;
          return <tr key={row.id}>
            <td><Link className="text-link" href={profileHref}>{row.name}</Link></td>
            <td>{row.email ?? "—"}</td>
            <td>{row.phone ?? "—"}</td>
            <td>{row.account_reference ?? "—"}</td>
            <td className="customer-row-action"><Link className="inventory-quiet-button" href={profileHref} aria-label={`View customer: ${row.name}`}>View customer</Link></td>
          </tr>;
        })}
      </tbody></table></div> : <p className="empty-state">{needle ? "No customers match this search." : "No customers yet."}</p>}
    </section>}
    {profile && directory && <>
      <section className="panel inventory-form-panel">
        <h2>Contact details</h2>
        <dl className="order-detail-facts">
          <div><dt>Email</dt><dd>{profile.customer.email ?? "—"}</dd></div>
          <div><dt>Phone</dt><dd>{profile.customer.phone ?? "—"}</dd></div>
          <div><dt>Account reference</dt><dd>{profile.customer.account_reference ?? "—"}</dd></div>
        </dl>
      </section>
      <section className="panel inventory-form-panel">
        <div className="consultation-heading"><h2>Current measurements</h2><button className="create-bill-button" type="button" onClick={() => setEditor("fitting")}><Plus size={16} /> Record fitting</button></div>
        {current ? <MeasurementSet customerId={profile.customer.id} fitting={current} fields={directory.fields} template={current.garment_type ? directory.templates?.[current.garment_type] : undefined} templateName={current.garment_type ? directory.templates?.[current.garment_type]?.name : undefined} /> : <p className="consultation-muted">No fitting recorded yet.</p>}
      </section>
      <section className="panel inventory-form-panel">
        <h2>Measurement history</h2>
        {profile.measurements.length > 1 ? profile.measurements.slice(1).map((fitting) => <details className="customer-fitting" key={fitting.id} open={fittingId === fitting.id || undefined}>
          <summary>{fitting.garment_type ? `${directory.templates?.[fitting.garment_type]?.name ?? fitting.garment_type} · ` : ""}{orderDate(fitting.measured_on)} · Fitting #{fitting.id}</summary>
          <MeasurementSet customerId={profile.customer.id} fitting={fitting} fields={directory.fields} template={fitting.garment_type ? directory.templates?.[fitting.garment_type] : undefined} />
        </details>) : <p className="consultation-muted">Earlier fittings will appear here when a new set is recorded.</p>}
      </section>
      <section className="panel inventory-form-panel">
        <h2>Linked orders</h2>
        {profile.orders.length ? <div className="inventory-alerts">{profile.orders.map((order) => <div key={order.reference}>
          <Link href={orderHref(order.reference)}><strong>{order.reference} · {order.category}</strong></Link><StatusBadge status={order.status} />
        </div>)}</div> : <p className="consultation-muted">No orders linked to this customer yet.</p>}
      </section>
    </>}
    {editor && directory && <CustomerEditor mode={editor} profile={profile} fields={directory.fields}
      onClose={() => setEditor(undefined)} onSaved={(id) => {
        setEditor(undefined);
        setRevision((value) => value + 1);
        if (!customerId) router.push(`/?section=customers&customer=${id}`);
      }} />}
  </>;
}

export function MeasurementSet({ fitting, fields, templateName, template, customerId }: { fitting: Fitting; fields: Record<string, string>; templateName?: string; template?: MeasurementTemplate; customerId?: number }) {
  return <>
    <p className="consultation-muted">{templateName && `${templateName} · `}{orderDate(fitting.measured_on)} · Fitting #{fitting.id}</p>
    <FittingReadings fitting={fitting} fields={fields} template={template}/>
    {customerId && <FittingMedia customerId={customerId} fittingId={fitting.id} attachments={fitting.attachments ?? []}/>}
    {fitting.notes && <p className="consultation-muted">{fitting.notes}</p>}
  </>;
}

export function CustomerEditor({ mode, profile, fields, templateId, template, unit = 'cm', fullScreen = false, onClose, onSaved, onBusyChange }: {
  mode: "customer" | "fitting"; profile?: Profile; fields: Record<string, string>;
  templateId?: string; template?: MeasurementTemplate;
  unit?: MeasurementUnit;
  fullScreen?: boolean;
  onClose: () => void; onSaved: (id: number) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const requestId = useRef<string | null>(null);
  const customer = profile?.customer;
  const previous = templateId ? profile?.measurements.find((item) => item.garment_type === templateId) : profile?.measurements[0];
  const fitting = mode === "fitting";
  const label = fitting ? (template ? `Measure · ${template.name}` : "Record fitting") : customer ? "Edit customer profile" : "Add customer";
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {onBusyChange?.(busy); return () => onBusyChange?.(false);}, [busy, onBusyChange]);
  useEffect(() => {
    if (!busy) return;
    const preventLeaving = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = '';};
    window.addEventListener('beforeunload', preventLeaving);
    return () => window.removeEventListener('beforeunload', preventLeaving);
  }, [busy]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (fitting && !customer)) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (fitting && customer) {
        requestId.current ??= createRequestId();
        const measurements = fittingFormValues(data, fields);
        const payload = {request_id: requestId.current, measured_on: data.get('measured_on'), garment_type: templateId, unit, ...measurements, notes: data.get('notes')};
        if (!Object.keys(measurements.values).length && !measurements.additional_measurements.length) throw new Error('Enter at least one measurement.');
        let body: BodyInit = JSON.stringify(payload);
        if (attachments.length) {
          const upload = new FormData(); upload.append('payload', JSON.stringify(payload));
          attachments.forEach(file => upload.append('attachments[]', file)); body = upload;
        }
        await customerApi(`?id=${customer.id}&mode=measurements`, {
          method: "POST", body,
        });
        onSaved(customer.id);
      } else {
        const result = await customerApi<{ id: number }>(customer ? `?id=${customer.id}` : "", {
          method: customer ? "PATCH" : "POST",
          body: JSON.stringify({ name: data.get("name"), email: data.get("email"), phone: data.get("phone"), account_reference: data.get("account_reference") }),
        });
        onSaved(result.id);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this record.");
    } finally {
      setBusy(false);
    }
  }

  return <InventoryDrawer label={label} fullScreen={fullScreen} dismissible={!busy} onClose={() => { if (!busy) onClose(); }}>
    <section className="panel inventory-form-panel">
      <div className="inventory-form-title">{fullScreen && <button className="fitting-screen-back" type="button" aria-label="Back" disabled={busy} onClick={onClose}><ArrowLeft size={20}/></button>}<h2>{label}</h2><button className="fitting-screen-close" type="button" aria-label="Close form" disabled={busy} onClick={onClose}><X size={18} /></button></div>
      <form onSubmit={save}>
        {fitting ? <>
          <p className="consultation-muted">Enter measurements in {unit === 'in' ? 'inches' : 'centimetres'}. Leave anything you have not measured blank. Use + to add fields or remove any you do not need.</p>
          <div className="inventory-form-grid">
            <label className="inventory-wide-field">Fitting date<input type="date" name="measured_on" defaultValue={today} max={today} required /></label>
          </div>
          <FittingFields fields={fields} template={template} previous={previous} unit={unit} busy={busy} onAttachmentsChange={setAttachments}/>
          <div className="inventory-form-grid">
            <label className="inventory-wide-field">Fitting notes (optional)<textarea name="notes" rows={3} maxLength={1000} /></label>
          </div>
        </> : <>
          <p className="consultation-muted">Enter the customer’s name and at least one contact method. An account reference is optional.</p>
          <div className="inventory-form-grid">
            <label className="inventory-wide-field">Name<input name="name" defaultValue={customer?.name} maxLength={150} required /></label>
            <label>Email<input type="email" name="email" defaultValue={customer?.email ?? ""} maxLength={254} /></label>
            <label>Phone<input type="tel" name="phone" defaultValue={customer?.phone ?? ""} maxLength={40} /></label>
            <label className="inventory-wide-field">Account reference (optional)<input name="account_reference" defaultValue={customer?.account_reference ?? ""} maxLength={100} /></label>
          </div>
        </>}
        {error && <p className="collection-error" role="alert">{error}</p>}
        <div className="inventory-form-footer"><button type="submit" disabled={busy}>{busy ? "Saving…" : fitting ? "Save fitting" : "Save customer"}</button></div>
      </form>
    </section>
  </InventoryDrawer>;
}
