"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, ChevronRight, ClipboardList, Search, UserRound, Users, X } from "@/components/icons";
import { can, type StaffIdentity } from "@/lib/staff-permissions";
import StudioTools from "../showroom/studio-tools";
import StatusBadge from "../status-badge";
import { orderDate } from "../order-table";
import { ProductionOrderPanels, productionEndpoints, productionJson, typeLabel, type Detail, type ProductionOrder, type Tailor } from "../production-workspace";

type View = "orders" | "tailors";
type Progress = "active" | "completed" | "all";
type ListData = { orders: ProductionOrder[]; tailors: Tailor[]; can_manage: boolean; seen_at: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (order: Pick<ProductionOrder, "is_complete" | "expected_completion_date">) => !order.is_complete && Boolean(order.expected_completion_date && order.expected_completion_date < today());

/** NY Production: the workroom view of custom and alteration orders, laid out like NY Studio. */
export default function ProductionStudio({ staff, initialOrder, initialView }: { staff: StaffIdentity; initialOrder?: string; initialView: View }) {
  const manage = can(staff, "production.manage");
  const [view, setView] = useState<View>(initialView);
  const [reference, setReference] = useState(initialOrder);
  const [list, setList] = useState<ListData>();
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<Progress>("active");
  const [tailor, setTailor] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    productionJson<ListData>("/api/staff-production", { signal: controller.signal }).then((result) => { setList(result); setListError(""); })
      .catch((failure) => { if (!controller.signal.aborted) setListError(failure.message); });
    return () => controller.abort();
  }, [revision]);

  // New arrivals show on the bell, so refresh the list every minute while the page is open.
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setRevision((value) => value + 1); }, 60000);
    return () => clearInterval(timer);
  }, []);

  // The address keeps the open order and module, so Back and refresh behave like NY Studio.
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const order = params.get("order");
      setReference(order && /^[A-Z0-9-]{3,40}$/.test(order) ? order : undefined);
      setView(params.get("view") === "tailors" && manage ? "tailors" : "orders");
    };
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [manage]);

  const navigate = useCallback((next: { view?: View; order?: string }) => {
    const url = new URL(window.location.href);
    url.search = "";
    if (next.view === "tailors") url.searchParams.set("view", "tailors");
    if (next.order) url.searchParams.set("order", next.order);
    window.history.pushState(null, "", url);
    setView(next.view ?? "orders"); setReference(next.order);
  }, []);

  function showOrders(filter?: { tailor?: string }) {
    if (filter) { setTailor(filter.tailor ?? ""); setProgress("active"); setQuery(""); }
    navigate({ view: "orders" });
    requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
  }

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return (list?.orders ?? []).filter((order) => (progress === "all" || (progress === "completed") === order.is_complete)
      && (!tailor || (tailor === "none" ? !order.assigned_tailor : String(order.assigned_tailor?.id) === tailor))
      && (!search || [order.reference, order.customer_name, ...order.items.map((item) => item.garment_name)].some((value) => value.toLowerCase().includes(search))));
  }, [list, query, progress, tailor]);

  return <main className="showroom is-fitting production-studio">
    <div className="showroom-main">
      <header className="showroom-header">
        <div className="showroom-module-navigation">
          <button type="button" className="showroom-home-button showroom-header-brand" aria-label="NY Production orders" onClick={() => showOrders()}><Image src="/ny-mark.svg" alt="" width={34} height={34} /><span><strong>NY ATELIER</strong><small>NY Production</small></span></button>
          <div className="studio-module-dock">
            <nav aria-label="NY Production modules">
              <button aria-pressed={view === "orders"} onClick={() => showOrders()}>{manage ? "Orders" : "My work"}</button>
              {manage && <button aria-pressed={view === "tailors"} onClick={() => navigate({ view: "tailors" })}>Tailors</button>}
            </nav>
          </div>
        </div>
        <div className="showroom-header-actions"><ProductionBell list={list} manage={manage} onOpen={(order) => navigate({ order })} onSeen={(seen_at) => setList((current) => current && { ...current, seen_at })} /><StudioTools staff={staff} workspace="production" /></div>
      </header>

      {view === "tailors" && manage ? <TailorBoard list={list} error={listError} onRetry={() => setRevision((value) => value + 1)} onOpen={(id) => showOrders({ tailor: id })} /> : <>
        <div className="showroom-intro showroom-fitting-intro"><div><h1>{manage ? "From fitting to finish." : "Your work."}</h1></div></div>
        <div className={`showroom-fitting-layout is-${reference ? "profile" : "customers"}`}>
          <section className="showroom-directory production-directory" aria-label="Production orders">
            <h2>{manage ? "What are we making?" : "Assigned to you"}</h2>
            <label className="showroom-search"><Search size={19} /><input ref={searchRef} type="search" aria-label="Find an order" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Customer, garment or order" /></label>
            <div className="production-filters">
              <div className="production-segments" role="group" aria-label="Progress">
                {(["active", "completed", "all"] as const).map((value) => <button key={value} type="button" aria-pressed={progress === value} onClick={() => setProgress(value)}>{value === "active" ? "In progress" : value === "completed" ? "Done" : "All"}</button>)}
              </div>
              {manage && list && <label className="production-tailor-filter"><span className="sr-only">Filter by tailor</span><select value={tailor} onChange={(event) => setTailor(event.target.value)}>
                <option value="">All tailors</option><option value="none">Needs a tailor</option>{list.tailors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>}
            </div>
            <div className="showroom-customer-list">
              {listError ? <p className="collection-error" role="alert">{listError} <button className="showroom-secondary" onClick={() => setRevision((value) => value + 1)}>Retry</button></p>
                : !list ? <p role="status" className="production-muted">Loading orders…</p>
                : !visible.length ? <p className="production-muted">{list.orders.length ? "No orders match." : manage ? "Nothing has been sent to production yet." : "Nothing is assigned to you yet."}</p>
                : visible.map((order) => <button key={order.reference} type="button" className="showroom-person production-order-row" aria-pressed={order.reference === reference} onClick={() => navigate({ order: order.reference })}>
                  <span className="showroom-initial">{order.customer_name.slice(0, 1)}</span>
                  <span><strong>{order.customer_name}</strong><small>{order.items.map((item) => item.garment_name).join(" · ")}</small>
                    <small className="production-row-meta">{isOverdue(order) ? <em>Overdue</em> : order.is_complete ? "Completed" : order.expected_completion_date ? `Due ${orderDate(order.expected_completion_date)}` : order.status}{manage && <> · <span className={order.assigned_tailor ? undefined : "is-empty"}>{order.assigned_tailor?.name ?? "No tailor"}</span></>}</small></span>
                  <ChevronRight size={17} />
                </button>)}
            </div>
          </section>
          <section className="showroom-record production-record" tabIndex={0} aria-label="Production order">
            <button type="button" className="showroom-home-button showroom-customers-back" onClick={() => navigate({})}><ArrowLeft size={18} />Back to orders</button>
            {reference ? <OrderRecord key={reference} reference={reference} onChanged={() => setRevision((value) => value + 1)} onReturned={() => { setRevision((value) => value + 1); navigate({}); }} />
              : <div className="showroom-empty"><ClipboardList size={48} /><h2>{manage ? "Every garment, every hand." : "Your next piece is here."}</h2><p>{manage ? "Choose an order to see the customer, their fitting, the inspiration and specifications, and to assign a tailor." : "Choose an order to see the measurements, inspiration and specifications."}</p></div>}
          </section>
        </div>
      </>}
    </div>
  </main>;
}

function OrderRecord({ reference, onChanged, onReturned }: { reference: string; onChanged: () => void; onReturned: () => void }) {
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    productionJson<Detail>(productionEndpoints.detail(reference), { signal: controller.signal }).then((result) => { setDetail(result); setError(""); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [reference, retry]);

  if (error) return <p className="collection-error" role="alert">{error} <button className="showroom-secondary" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>;
  if (!detail) return <div className="showroom-empty"><UserRound size={44} /><h2>Opening order…</h2></div>;
  const { order, customer } = detail;
  return <>
    <div className="showroom-record-heading production-record-heading"><div>
      <p className="showroom-kicker">{typeLabel(order.category).toUpperCase()} · {order.reference}</p>
      <h2>{customer.name}</h2>
      <p>{order.items.map((item) => item.garment_name + (item.wearer_name ? ` for ${item.wearer_name}` : "")).join(" · ")}</p>
    </div><StatusBadge status={order.status} /></div>
    <ProductionOrderPanels detail={detail} onChange={(next) => { setDetail(next); onChanged(); }} onReturned={onReturned} />
  </>;
}

function TailorBoard({ list, error, onRetry, onOpen }: { list?: ListData; error: string; onRetry: () => void; onOpen: (tailor: string) => void }) {
  if (error) return <p className="collection-error" role="alert">{error} <button className="showroom-secondary" onClick={onRetry}>Retry</button></p>;
  if (!list) return <p role="status" className="production-muted">Loading tailors…</p>;
  const active = list.orders.filter((order) => !order.is_complete);
  const rows = [
    ...list.tailors.map((tailor) => ({ id: String(tailor.id), name: tailor.name, orders: active.filter((order) => order.assigned_tailor?.id === tailor.id) })),
  ];
  const unassigned = active.filter((order) => !order.assigned_tailor);
  return <>
    <div className="showroom-intro showroom-fitting-intro"><div><h1>The workroom.</h1></div></div>
    <div className="production-board">
      <button type="button" className="production-board-card is-unassigned" onClick={() => onOpen("none")}>
        <span className="production-board-icon"><ClipboardList size={22} /></span>
        <span><small>WAITING</small><strong>Needs a tailor</strong><span>{unassigned.length ? unassigned.slice(0, 3).map((order) => order.customer_name).join(" · ") : "Every active order has a tailor."}</span></span>
        <b>{unassigned.length}</b>
      </button>
      {rows.map((row) => {
        const overdue = row.orders.filter(isOverdue).length;
        return <button key={row.id} type="button" className="production-board-card" onClick={() => onOpen(row.id)}>
          <span className="production-board-icon"><UserRound size={22} /></span>
          <span><small>TAILOR</small><strong>{row.name}</strong><span>{row.orders.length ? `${row.orders.length} in progress${overdue ? ` · ${overdue} overdue` : ""}` : "Available"}</span></span>
          <b>{row.orders.length}</b>
        </button>;
      })}
      {!list.tailors.length && <div className="showroom-empty production-board-empty"><Users size={44} /><h3>No tailors yet.</h3><p>The owner invites tailors from NY Office → Team. Each tailor signs in to NY Production and sees only their own orders.</p></div>}
    </div>
  </>;
}

const ago = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 60000));
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.round(minutes / 60)} h ago` : orderDate(value.slice(0, 10));
};

/** Orders that reached this person since they last looked: sent to production (managers) or assigned to them (tailors). */
function ProductionBell({ list, manage, onOpen, onSeen }: { list?: ListData; manage: boolean; onOpen: (reference: string) => void; onSeen: (seenAt: string) => void }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<ProductionOrder[]>([]);
  const seen = list?.seen_at ? Date.parse(list.seen_at) : 0;
  const fresh = useMemo(() => (list?.orders ?? []).filter((order) => !order.is_complete && order.arrived_at && Date.parse(order.arrived_at) > seen)
    .sort((a, b) => Date.parse(b.arrived_at!) - Date.parse(a.arrived_at!)), [list, seen]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = fresh.length ? `(${fresh.length}) ${base}` : base;
  }, [fresh.length]);

  function toggle() {
    if (open) { setOpen(false); return; }
    setShown(fresh); setOpen(true);
    if (fresh.length) fetch("/api/staff-production/seen", { method: "POST" }).then((response) => response.ok ? response.json() : undefined)
      .then((result) => { if (result?.seen_at) onSeen(result.seen_at); }).catch(() => undefined);
  }

  return <div className="production-bell">
    <button type="button" className="production-bell-button" aria-expanded={open} aria-label={`Notifications${fresh.length ? `, ${fresh.length} new` : ""}`} onClick={toggle}>
      <Bell size={19} />{fresh.length > 0 && <span className="production-bell-count">{fresh.length > 9 ? "9+" : fresh.length}</span>}
    </button>
    {open && <div className="production-bell-panel" role="dialog" aria-label="Notifications">
      <div className="production-bell-heading"><strong>{manage ? "New in production" : "Newly assigned to you"}</strong><button type="button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={16} /></button></div>
      {shown.length ? <ul>{shown.map((order) => <li key={order.reference}><button type="button" onClick={() => { setOpen(false); onOpen(order.reference); }}>
        <span><strong>{order.customer_name}</strong><small>{order.items.map((item) => item.garment_name).join(" · ")}</small><small>{manage ? "Sent to production" : "Assigned to you"} · {ago(order.arrived_at!)}</small></span><ChevronRight size={16} />
      </button></li>)}</ul> : <p className="production-muted">Nothing new. {manage ? "Orders appear here when the front desk sends them to production." : "Orders appear here when they are assigned to you."}</p>}
    </div>}
  </div>;
}
