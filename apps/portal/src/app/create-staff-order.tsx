"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import { createRequestId } from "@/lib/request-id";

import { Plus, Scissors, Search, X } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { InventoryDrawer } from "./catalogue-editor";
import DeliveryMap, { type MapPin } from "./delivery-map";
import { PendingMedia, uploadOrderMedia } from "./order-inspiration";
import { customerApi, useCustomerSearch, type Profile } from "./customers-workspace";
import { orderDate, orderHref } from "./order-table";

type Category = "Custom" | "Alterations";
type Options = {
  customer_count: number;
  demo_customer_id: number | null;
  offerings: Record<string, string>;
  consultations: { id: string; purpose: string; confirmedDate: string; confirmedTime: string }[];
};

type CreationContext = { initialGarments?: string[]; garmentContext?: string; requireNotes?: boolean; preferredMeasurementId?: number; buttonLabel?: string };
type CreateStaffOrderProps = CreationContext & { category: Category; consultationId?: string; preferredCustomerId?: number; onCreated?: (reference: string) => void; buttonClassName?: string; disabled?: boolean;
  /** Open the form straight away without showing the button (e.g. right after saving a fitting). */
  startOpen?: boolean; onClosed?: () => void };
export default function CreateStaffOrder({ category, consultationId, preferredCustomerId, onCreated, buttonClassName = "create-bill-button", disabled, buttonLabel, startOpen = false, onClosed, ...context }: CreateStaffOrderProps) {
  const [open, setOpen] = useState(Boolean(consultationId) || startOpen);
  const label = category === "Custom" ? "Create custom order" : "Create alteration order";

  return <>
    {!startOpen && <button className={buttonClassName} type="button" disabled={disabled} onClick={() => setOpen(true)}>{category === "Alterations" ? <Scissors size={16} /> : <Plus size={16} />} {buttonLabel ?? label}</button>}
    {open && <StaffOrderForm {...context} category={category} consultationId={consultationId} preferredCustomerId={preferredCustomerId} onCreated={onCreated} label={label} onClose={() => { setOpen(false); onClosed?.(); }} />}
  </>;
}

function StaffOrderForm({ category, consultationId, preferredCustomerId, onCreated, label, onClose, initialGarments, garmentContext, requireNotes, preferredMeasurementId }: CreationContext & { category: Category; consultationId?: string; preferredCustomerId?: number; onCreated?: (reference: string) => void; label: string; onClose: () => void }) {
  const [options, setOptions] = useState<Options>();
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [garments, setGarments] = useState(() => initialGarments?.length ? initialGarments.slice(0, 20).map((_, index) => index) : [0]);
  const [picked, setPicked] = useState<{ id: number; name: string }>();
  const [profile, setProfile] = useState<Profile>();
  const [consultation, setConsultation] = useState(consultationId ?? "");
  const [fulfilment, setFulfilment] = useState("");
  const [deliveryPin, setDeliveryPin] = useState<MapPin>();
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [media, setMedia] = useState<File[]>([]);
  const [created, setCreated] = useState<string>();
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

  function finish(reference: string) {
    onClose();
    if (onCreated) onCreated(reference);
    else router.push(orderHref(reference, custom ? "atelier" : "orders"));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (created) { finish(created); return; }
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
          delivery: fulfilment === "Delivery" ? {
            recipient_name: String(form.get("delivery-recipient") ?? "").trim() || null,
            phone: String(form.get("delivery-phone") ?? "").trim() || null,
            address: deliveryAddress.trim(), area: deliveryArea.trim() || null,
            gps_code: String(form.get("delivery-gps") ?? "").trim() || null,
            directions: String(form.get("delivery-directions") ?? "").trim() || null,
            latitude: deliveryPin?.latitude ?? null, longitude: deliveryPin?.longitude ?? null,
          } : undefined,
          notes: [garmentContext, notes].filter(Boolean).join("\n\n"),
          specifications: String(form.get("specifications") ?? "").trim() || null,
          items: garments.map((id) => ({ garment_name: form.get(`garment-${id}`), wearer_name: form.get(`wearer-${id}`) })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create the order.");
      if (media.length) {
        try { await uploadOrderMedia(result.reference, media); } catch (failure) {
          setCreated(result.reference);
          setError(`Order ${result.reference} was created, but the inspiration didn’t upload (${failure instanceof Error ? failure.message : "try again"}). Add it from the order.`);
          return;
        }
      }
      finish(result.reference);
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
            {measurements.length > 0 && <label className="inventory-wide-field">Fitting used (optional)<select key={selectedCustomerId} name="measurement" defaultValue={selectedId === preferredCustomerId && measurements.some((item) => item.id === preferredMeasurementId) ? preferredMeasurementId : ""}>
              <option value="">No fitting linked</option>{measurements.map((item, index) => <option key={item.id} value={item.id}>{orderDate(item.measured_on)} · Fitting #{item.id}{index === 0 ? " · Current" : ""}</option>)}
            </select></label>}
            <label>Expected completion<input type="date" name="date" /></label>
            <label>Pickup or delivery<select name="fulfilment" value={fulfilment} onChange={(event) => setFulfilment(event.target.value)}><option value="">To be agreed</option><option value="Collection">Pickup (customer collects)</option><option value="Delivery">Delivery (drop-off)</option></select></label>
            <label className="inventory-wide-field">Specifications for production (optional)<textarea name="specifications" rows={4} maxLength={3000} placeholder="Fabric, colour, cut, lining, buttons, finishing — what the tailor needs to know. Not shown to the customer." /></label>
            <label className="inventory-wide-field">{requireNotes ? "Agreed adjustments" : "Customer-facing notes (optional)"}<textarea name="notes" rows={3} required={requireNotes} maxLength={garmentContext ? Math.max(1, 998 - garmentContext.length) : 1000} placeholder={requireNotes ? "Describe the adjustments agreed during the try-on." : "Record any agreed details the client should see."} /></label>
          </div>
          {consultationId && !selected && consultation === consultationId && <p role="status" className="consultation-muted">The original consultation is unavailable or already linked. Choose another or create a standalone order.</p>}
          {selected && <label className="collection-check"><input key={selected.id} name="held" type="checkbox" required /> This consultation has taken place.</label>}
          {fulfilment === "Delivery" && <fieldset className="inventory-size-entries delivery-details">
            <legend>Delivery details</legend>
            <div className="inventory-form-grid">
              <label>Recipient name<input name="delivery-recipient" maxLength={100} placeholder={selectedName ?? "Who receives it"} autoComplete="off" /></label>
              <label>Recipient phone<input name="delivery-phone" type="tel" inputMode="tel" maxLength={30} pattern="[0-9+()\-\s]{7,30}" placeholder="e.g. 024 000 0000" autoComplete="off" /></label>
              <label className="inventory-wide-field">Delivery address<input name="delivery-address" required maxLength={255} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="House number, street or building" autoComplete="off" /></label>
              <label>Area / city<input name="delivery-area" maxLength={100} value={deliveryArea} onChange={(event) => setDeliveryArea(event.target.value)} placeholder="e.g. East Legon, Accra" autoComplete="off" /></label>
              <label>GhanaPost GPS (optional)<input name="delivery-gps" maxLength={20} pattern="[A-Za-z]{2}-?[0-9]{3,4}-?[0-9]{4}" title="For example GA-123-4567" placeholder="e.g. GA-123-4567" autoComplete="off" /></label>
              <label className="inventory-wide-field">Directions for the rider (optional)<textarea name="delivery-directions" rows={2} maxLength={1000} placeholder="Landmarks, gate colour, who to call on arrival" /></label>
            </div>
            <div className="delivery-map-field"><span className="client-picker-label">Pin the spot on the map (optional)</span>
              <DeliveryMap pin={deliveryPin} onChange={setDeliveryPin} searchHint={[deliveryAddress, deliveryArea].filter((part) => part.trim()).join(", ")} /></div>
          </fieldset>}
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
          <PendingMedia onChange={setMedia} disabled={busy || Boolean(created)} />
          {error && <p role="alert" className="collection-error">{error}</p>}
          <div className="inventory-form-footer"><button type="submit" disabled={busy || !selectedId}>{created ? "Done" : busy ? (media.length ? "Creating and uploading…" : "Creating…") : label}</button></div>
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
