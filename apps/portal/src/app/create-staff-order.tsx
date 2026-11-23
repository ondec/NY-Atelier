"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import { createRequestId } from "@/lib/request-id";

import { Plus, Scissors, Search, X } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { InventoryDrawer } from "./catalogue-editor";
import { customerApi, useCustomerSearch, type Profile } from "./customers-workspace";
import { orderDate, orderHref } from "./order-table";

type Category = "Custom" | "Alterations";
type Options = {
  customer_count: number;
  demo_customer_id: number | null;
  offerings: Record<string, string>;
  consultations: { id: string; purpose: string; confirmedDate: string; confirmedTime: string }[];
};

type CreationContext = { initialGarments?: string[]; garmentContext?: string; requireNotes?: boolean };
type CreateStaffOrderProps = CreationContext & { category: Category; consultationId?: string; preferredCustomerId?: number; onCreated?: (reference: string) => void; buttonClassName?: string; disabled?: boolean };
export default function CreateStaffOrder({ category, consultationId, preferredCustomerId, onCreated, buttonClassName = "create-bill-button", disabled, ...context }: CreateStaffOrderProps) {
  const [open, setOpen] = useState(Boolean(consultationId));
  const label = category === "Custom" ? "Create custom order" : "Create alteration order";

  return <>
    <button className={buttonClassName} type="button" disabled={disabled} onClick={() => setOpen(true)}>{category === "Alterations" ? <Scissors size={16} /> : <Plus size={16} />} {label}</button>
    {open && <StaffOrderForm {...context} category={category} consultationId={consultationId} preferredCustomerId={preferredCustomerId} onCreated={onCreated} label={label} onClose={() => setOpen(false)} />}
  </>;
}

function StaffOrderForm({ category, consultationId, preferredCustomerId, onCreated, label, onClose, initialGarments, garmentContext, requireNotes }: CreationContext & { category: Category; consultationId?: string; preferredCustomerId?: number; onCreated?: (reference: string) => void; label: string; onClose: () => void }) {
  const [options, setOptions] = useState<Options>();
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [garments, setGarments] = useState(() => initialGarments?.length ? initialGarments.slice(0, 20).map((_, index) => index) : [0]);
  const [picked, setPicked] = useState<{ id: number; name: string }>();
  const [profile, setProfile] = useState<Profile>();
  const [consultation, setConsultation] = useState(consultationId ?? "");
  const requestId = useRef<string | null>(null);
  const nextGarmentId = useRef(initialGarments?.length ?? 1);
  const router = useRouter();
  const custom = category === "Custom";
  const initialCustomerId = preferredCustomerId ?? (consultationId ? options?.demo_customer_id : null);
  const selectedId = picked?.id ?? initialCustomerId ?? null;
  const selectedCustomerId = String(selectedId ?? "");
  const selectedProfile = profile?.customer.id === selectedId ? profile : undefined;
  const selectedName = picked?.name ?? selectedProfile?.customer.name;
  const canLinkConsultation = Boolean(options?.demo_customer_id && Number(selectedCustomerId) === options.demo_customer_id);
  const selected = canLinkConsultation ? options?.consultations.find((item) => item.id === consultation) : undefined;
  const measurements = selectedProfile?.measurements ?? [];
  const initialPurpose = options?.consultations.find((item) => item.id === consultationId)?.purpose;
  const offering = initialPurpose === "Custom clothing" ? "bespoke" : initialPurpose === "Special event outfit" ? "special-events"
    : Object.entries(options?.offerings ?? {}).find(([, title]) => title === initialPurpose)?.[0];

  useEffect(() => {
    const controller = new AbortController();
    fetch(orderEndpoint("options"), { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not load clients and services. Close the form and try again.");
      setOptions(result);
    }).catch((failure) => {
      if (!controller.signal.aborted) setLoadError(failure.message);
    });
    return () => controller.abort();
  }, []);

  // The chosen client's fittings are fetched on their own so the form never downloads every record.
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    customerApi<Profile>(`?id=${selectedId}`, { signal: controller.signal }).then(setProfile).catch(() => undefined);
    return () => controller.abort();
  }, [selectedId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const notes = String(form.get("notes") ?? "").trim();
    if (requireNotes && !notes) {
      setError("Describe the agreed adjustments before creating the order.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      requestId.current ??= createRequestId();
      const response = await fetch(orderEndpoint("create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId.current, category, customer_id: Number(form.get("customer")),
          service_offering: custom ? form.get("offering") : undefined,
          consultation_id: custom ? form.get("consultation") || null : undefined,
          consultation_held: form.has("held"),
          measurement_id: form.get("measurement") ? Number(form.get("measurement")) : null,
          expected_completion_date: form.get("date") || null,
          fulfilment_method: form.get("fulfilment") || null,
          notes: [garmentContext, notes].filter(Boolean).join("\n\n"),
          items: garments.map((id) => ({ garment_name: form.get(`garment-${id}`), wearer_name: form.get(`wearer-${id}`) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create the order.");
      onClose();
      if (onCreated) onCreated(result.reference);
      else router.push(orderHref(result.reference, custom ? "atelier" : "orders"));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not create the order.");
    } finally {
      setBusy(false);
    }
  }

  return <InventoryDrawer label={label} dismissible={!busy} onClose={() => { if (!busy) onClose(); }}>
    <section className="panel inventory-form-panel">
      <div className="inventory-form-title"><h2>{label}</h2><button type="button" aria-label="Close form" disabled={busy} onClick={onClose}><X size={18} /></button></div>
      {loadError ? <p role="alert">{loadError}</p> : !options ? <p role="status">Loading clients and services…</p> : (
        <form onSubmit={save}>
          {garmentContext && <p className="showroom-alteration-context">{garmentContext}</p>}
          <p className="consultation-muted">The linked client will see this order under Active orders in the customer app.</p>
          <div className="inventory-form-grid">
            <ClientPicker selectedId={selectedId} selectedName={selectedName} onPick={(client) => { setPicked(client); setConsultation(""); }} />
            {custom && <label>Service offering<select name="offering" required defaultValue={offering ?? ""}>
              <option value="" disabled>Select an offering</option>{Object.entries(options.offerings).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select></label>}
            {custom && canLinkConsultation && <label className="inventory-wide-field">Confirmed consultation (optional)<select name="consultation" value={selected?.id ?? ""} onChange={(event) => setConsultation(event.target.value)}>
              <option value="">No linked consultation</option>{options.consultations.map((item) => <option key={item.id} value={item.id}>{item.purpose} · {orderDate(item.confirmedDate)} · {item.confirmedTime} Accra</option>)}
            </select></label>}
            {measurements.length > 0 && <label className="inventory-wide-field">Fitting used (optional)<select key={selectedCustomerId} name="measurement" defaultValue="">
              <option value="">No fitting linked</option>{measurements.map((item, index) => <option key={item.id} value={item.id}>{orderDate(item.measured_on)} · Fitting #{item.id}{index === 0 ? " · Current" : ""}</option>)}
            </select></label>}
            <label>Expected completion<input type="date" name="date" /></label>
            <label>Fulfilment<select name="fulfilment"><option value="">To be agreed</option><option>Collection</option><option>Delivery</option></select></label>
            <label className="inventory-wide-field">{requireNotes ? "Agreed adjustments" : "Customer-facing notes (optional)"}<textarea name="notes" rows={3} required={requireNotes} maxLength={garmentContext ? Math.max(1, 998 - garmentContext.length) : 1000} placeholder={requireNotes ? "Describe the adjustments agreed during the try-on." : "Record any agreed details the client should see."} /></label>
          </div>
          {consultationId && !selected && consultation === consultationId && <p role="status" className="consultation-muted">The original consultation is unavailable or already linked. Choose another or create a standalone order.</p>}
          {selected && <label className="collection-check"><input key={selected.id} name="held" type="checkbox" required /> This consultation has taken place.</label>}
          <fieldset className="inventory-size-entries">
            <legend>Garments</legend>
            {garments.map((id, index) => <div className="consultation-slot" key={id}>
              <div className="inventory-form-grid">
                <label>Garment {index + 1}<input name={`garment-${id}`} defaultValue={initialGarments?.[id]} required maxLength={150} placeholder={custom ? "e.g. Tailored suit" : "e.g. Trouser hem adjustment"} /></label>
                <label>Wearer (optional)<input name={`wearer-${id}`} maxLength={100} /></label>
              </div>
              {garments.length > 1 && <button className="inventory-quiet-button" type="button" onClick={() => setGarments(garments.filter((value) => value !== id))}>Remove garment {index + 1}</button>}
            </div>)}
            {garments.length < 20 && <button className="inventory-quiet-button" type="button" onClick={() => { const id = nextGarmentId.current++; setGarments([...garments, id]); }}>Add another garment</button>}
          </fieldset>
          {error && <p role="alert" className="collection-error">{error}</p>}
          <div className="inventory-form-footer"><button type="submit" disabled={busy || !selectedId}>{busy ? "Creating…" : label}</button></div>
        </form>
      )}
    </section>
  </InventoryDrawer>;
}

/** Search-as-you-type client choice; submits the chosen id as the "customer" form field. */
function ClientPicker({ selectedId, selectedName, onPick }: { selectedId: number | null; selectedName?: string; onPick: (client: { id: number; name: string }) => void }) {
  const [query, setQuery] = useState("");
  const [changing, setChanging] = useState(false);
  const searching = changing || !selectedId;
  const search = useCustomerSearch(query, { perPage: 8, enabled: searching });
  return <div className="inventory-wide-field client-picker">
    <input type="hidden" name="customer" value={selectedId ?? ""} />
    <span className="client-picker-label">Client</span>
    {!searching ? <div className="client-picker-chosen">
      <strong>{selectedName ?? "Loading client…"}</strong>
      <button className="inventory-quiet-button" type="button" onClick={() => setChanging(true)}>Change</button>
    </div> : <>
      <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search clients</span>
        <input type="search" autoFocus={changing} placeholder="Search by name, phone or email" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="client-picker-results">
        {search.customers.map((client) => <button key={client.id} type="button" className="client-picker-option" aria-pressed={client.id === selectedId}
          onClick={() => { onPick({ id: client.id, name: client.name }); setChanging(false); setQuery(""); }}>
          <strong>{client.name}</strong><small>{client.phone ?? client.email ?? client.account_reference ?? ""}</small></button>)}
        {search.searching && <p role="status">Searching clients…</p>}
        {search.error && <p role="alert">{search.error}</p>}
        {!search.searching && !search.error && !search.customers.length && <p>{query.trim() ? "No clients match this search." : "No clients yet."}</p>}
        {search.total > search.customers.length && <p className="consultation-muted">{(search.total - search.customers.length).toLocaleString()} more. Type more of the name or number to narrow the list.</p>}
      </div>
      {changing && selectedId && <button className="inventory-quiet-button" type="button" onClick={() => { setChanging(false); setQuery(""); }}>Keep {selectedName ?? "current client"}</button>}
    </>}
  </div>;
}
