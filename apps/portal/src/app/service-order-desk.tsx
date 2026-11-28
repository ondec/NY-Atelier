"use client";

import Link from "next/link";
import { Columns3, List, Search } from "@/components/icons";
import { useState } from "react";
import FilterMenu from "./filter-menu";

import { filterOrderDesk, orderStage, orderTypes, parseOrderType } from "@/lib/order-desk";
import type { DemoOrder } from "@/lib/orders";
import { orderAttention, statusTone } from "@/lib/status";
import StatusBadge from "./status-badge";
import { OrderTable, orderDate, orderHref, serviceName } from "./order-table";
import {orderSources, orderSourceLabel, type OrderSource} from '@/lib/order-source';


const stageOf = orderStage;
const stagesFor = (orders: DemoOrder[]) => [...new Set(orders.map(stageOf))];
const views = [{ id: "list", label: "List", Icon: List }, { id: "kanban", label: "Kanban", Icon: Columns3 }] as const;

export default function ServiceOrderDesk({ section, orders, unavailable, onOpenOrder, initialType = "", showFulfilment = section === "alterations" }: {
  showFulfilment?: boolean;
  section: string;
  initialType?: DemoOrder["category"] | "";
  orders: DemoOrder[];
  unavailable: boolean;
  onOpenOrder?: (order: DemoOrder) => void;
}) {
  const [view, setView] = useState<(typeof views)[number]["id"]>("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState<DemoOrder["category"] | "">(initialType);
  const [fulfilment, setFulfilment] = useState("");
  const [source, setSource] = useState<OrderSource | 'unrecorded' | ''>('');
  const query = search.trim().toLowerCase();
  const statusOrders = filterOrderDesk(orders, { category, status, source, query: "", stage: "", fulfilment: "" });
  const stages = stagesFor(statusOrders);
  const fulfilmentMethods = [...new Set(orders.flatMap((order) => order.fulfilment_method ? [order.fulfilment_method] : []))];
  const visible = filterOrderDesk(orders, { category, status, query, stage, fulfilment, source });
  const filtered = Boolean(query || status !== "all" || stage || fulfilment || category || source);
  /** How many filters in the drop-down are set (search is separate). */
  const activeFilters = [status !== "all", section === "orders" && category, source, stage, fulfilment].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setStage("");
    setFulfilment("");
    setCategory("");
    setSource('');
  }

  return <section className="panel full-panel order-desk">
    <div className="panel-heading">
      <div><div className="eyebrow">ORDER DESK</div><h2>Orders <span className="heading-count" aria-live="polite">{unavailable ? "—" : visible.length}</span></h2></div>
      <div className="order-desk-views" role="group" aria-label="Order view">
        {views.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}><Icon size={16} aria-hidden="true" />{label}</button>)}
      </div>
    </div>
    <div className="inventory-toolbar order-desk-toolbar">
      <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search orders</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer or garment" /></label>
      <FilterMenu count={activeFilters} canClear={filtered} onClear={clearFilters}>
        <label>Status<select aria-label="Filter order status" value={status} onChange={(event) => { setStatus(event.target.value); setStage(""); }}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select></label>
        {section === "orders" && <label>Order type<select aria-label="Filter order type" value={category} onChange={(event) => { setCategory(parseOrderType(event.target.value)); setStage(""); }}>
          <option value="">All order types</option>{orderTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select></label>}
        <label>Source<select aria-label="Filter order source" value={source} onChange={event=>{const value=event.target.value;setSource(value==='unrecorded'?'unrecorded':orderSources.find(item=>item.value===value)?.value??'');setStage('');}}>
          <option value="">All sources</option>{orderSources.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}<option value="unrecorded">Not recorded</option>
        </select></label>
        <label>Stage<select aria-label="Filter order stage" value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="">All stages</option>{stages.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>Fulfilment<select aria-label="Filter fulfilment method" value={fulfilment} onChange={(event) => setFulfilment(event.target.value)}>
          <option value="">All fulfilment methods</option>{fulfilmentMethods.map((value) => <option key={value}>{value}</option>)}
        </select></label>
      </FilterMenu>
    </div>
    {unavailable ? <OrderTable orders={[]} unavailable /> : !visible.length ? (
      <p className="empty-state">{filtered ? "No orders match these filters." : "No orders for this service yet."}</p>
    ) : view === "list" ? (
      <OrderTable orders={visible} unavailable={false} section={section} onOpenOrder={onOpenOrder} showFulfilment={showFulfilment} showSource />
    ) : (
      <div className="order-board" aria-label="Orders grouped by stage">
        {stagesFor(visible).map((column) => {
          const cards = visible.filter((order) => stageOf(order) === column);
          return <section className="order-board-column" key={column} aria-label={column} data-tone={statusTone(column)}>
            <h3>{column} <span>{cards.length}</span></h3>
            {cards.map((order) => {
              const attention = orderAttention(order);
              const content = <>
              <strong>{order.reference}</strong>
              <span>{order.customer_name}</span>
              {section === "orders" && <span>{serviceName(order)}</span>}
              <span className="order-source-label">{orderSourceLabel(order.source)}</span>
              {order.service_offering && <span>{order.service_offering}</span>}
              <span>{order.items.map((item) => item.garment_name).join(" · ")}</span>
              {attention && <StatusBadge status={attention.label} tone={attention.tone} />}
              {showFulfilment && <span className="order-board-fulfilment">{order.fulfilment_method ?? "Fulfilment to be agreed"}</span>}
              <small>{order.is_complete ? order.status : order.expected_completion_date ? `Expected ${orderDate(order.expected_completion_date)}` : "Completion to be agreed"}</small>
              </>;
              return onOpenOrder ? <button type="button" className="order-board-card" data-attention={attention?.tone} key={order.reference} onClick={() => onOpenOrder(order)} aria-label={`View order ${order.reference}`}>{content}</button> : <Link prefetch={false} className="order-board-card" data-attention={attention?.tone} key={order.reference} href={orderHref(order.reference, section)}>{content}</Link>;
            })}
          </section>;
        })}
      </div>
    )}
  </section>;
}

