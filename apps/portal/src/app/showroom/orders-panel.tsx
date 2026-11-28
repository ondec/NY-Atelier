"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import { useEffect, useRef, useState } from "react";
import { X } from "@/components/icons";
import { useStaff } from "../staff-context";
import type { DemoOrder } from "@/lib/orders";
import { InventoryDrawer } from "../catalogue-editor";
import NewOrderButtons from "./new-order-buttons";
import ServiceOrderDesk from "../service-order-desk";
import OrderDetailsContent from "../order-details-content";

type Stage = "new" | "production" | "package" | "send" | "out" | "done";
const stages: [Stage, string][] = [["new", "New"], ["production", "In production"], ["package", "Collect & package"], ["send", "Ready to send"], ["out", "Out for delivery / pick-up"], ["done", "Delivered / collected"]];
/** The RTW store packs everything itself and sends it out. */
const rtwLabels: Partial<Record<Stage, string>> = { package: "To package", send: "Ready for delivery", out: "Sent out", done: "Delivered" };

/** Where an order is in reception's day, for the quick stage buttons. */
function stageOf(order: DemoOrder): Stage | undefined {
  const current = order.workflow?.current ?? "";
  if (order.is_complete) return ["delivered", "collected"].includes(current) ? "done" : undefined;
  if (order.reception === "to_package") return "package";
  if (current === "packaged") return "send";
  if (current === "out_for_delivery" || current === "ready_collection") return "out";
  if (["in_production", "production_done"].includes(current)) return "production";
  return "new";
}

/** NY Studio's Orders panel: every order, so reception sees what is coming and what production sends back. */
export default function ShowroomOrders({ canCreate, onSell }: { canCreate: boolean; onSell?: () => void }) {
  const staff = useStaff();
  const myStore = staff?.location ?? null;
  const [storeView, setStoreView] = useState<"" | "atelier" | "rtw_store">("");
  const store = myStore ?? storeView;
  const [orders, setOrders] = useState<DemoOrder[]>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [task, setTask] = useState<"" | Stage>("");
  const [selectedOrder, setSelectedOrder] = useState<DemoOrder>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);

  function closeOrder() { detailRequest.current?.abort(); setSelectedOrder(undefined); }
  function openOrder(order: DemoOrder) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setSelectedOrder(order); setDetailLoading(true); setDetailError("");
    fetch(orderEndpoint("detail", order.reference), { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || payload.order?.reference !== order.reference) throw new Error(payload.message ?? "Could not load the latest order.");
      if (!controller.signal.aborted) { setSelectedOrder(payload.order); setOrders((rows) => rows?.map((row) => row.reference === order.reference ? payload.order : row)); }
    }).catch((failure) => { if (!controller.signal.aborted) setDetailError(failure.message); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(orderEndpoint("list"), { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.orders)) throw new Error(payload.message ?? "Could not load orders.");
      setOrders(payload.orders);
      setError("");
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [revision]);


  const mine = orders?.filter((order) => !store || order.store?.key === store);

  return <>
    <div className="showroom-intro"><div><h1>Orders</h1>{myStore && <p className="showroom-hint">{myStore === "rtw_store" ? "RTW store" : "Bespoke atelier"} orders</p>}</div>
      {!myStore && <div className="order-desk-views" role="group" aria-label="Store">{([["", "Both stores"], ["atelier", "Atelier"], ["rtw_store", "RTW store"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={storeView === key} onClick={() => setStoreView(key)}>{label}</button>)}</div>}
      {canCreate && <NewOrderButtons onSell={onSell} onCreated={(reference) => { setNotice(`Order ${reference} created.`); setRevision((value) => value + 1); }} />}
    </div>
    {mine && <div className="studio-reception-tasks" role="group" aria-label="Order stages">
      {stages.filter(([key]) => key !== "production" || store !== "rtw_store").map(([key, atelierLabel]) => {
        const label = store === "rtw_store" ? rtwLabels[key] ?? atelierLabel : atelierLabel;
        const count = mine.filter((order) => stageOf(order) === key).length;
        return <button key={key} type="button" aria-pressed={task === key} data-due={(count > 0 && (key === "package" || key === "send")) || undefined} onClick={() => setTask(task === key ? "" : key)}><strong>{count}</strong>{label}</button>;
      })}
      {task && <button type="button" className="text-link" onClick={() => setTask("")}>Show all orders</button>}
    </div>}
    {notice && <p className="inventory-message" role="status">{notice}</p>}
    <div className="showroom-order-desk">
      {error ? <p role="alert" className="collection-error">{error} <button className="showroom-secondary" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : !orders ? <p role="status">Loading orders…</p> : <ServiceOrderDesk section="orders" showFulfilment orders={task ? (mine ?? []).filter((order) => stageOf(order) === task) : mine ?? []} unavailable={false} onOpenOrder={openOrder} />}
    </div>
    {selectedOrder && <InventoryDrawer label={`Order ${selectedOrder.reference}`} onClose={closeOrder}>
      <div className="showroom-order-details">
        <div className="inventory-form-title"><div><p className="showroom-kicker">{selectedOrder.category === "Custom" ? "CUSTOM ORDER" : selectedOrder.category === "Alterations" ? "ALTERATION ORDER" : "ORDER"}</p><h2>{selectedOrder.reference}</h2><p>{selectedOrder.customer_name}</p></div><button type="button" aria-label="Close order details" onClick={closeOrder}><X size={20} /></button></div>
        {detailLoading ? <p role="status">Loading the latest order…</p> : detailError ? <p role="alert">{detailError} <button className="inventory-quiet-button" onClick={() => openOrder(selectedOrder)}>Retry</button></p> : <OrderDetailsContent order={selectedOrder} showWorkspaceLinks={false} onUpdated={(order) => { setSelectedOrder(order); setTask((current) => current && stageOf(order) !== current ? stageOf(order) ?? "" : current); setOrders((rows) => rows?.map((row) => row.reference === order.reference ? order : row)); }} />}
      </div>
    </InventoryDrawer>}
  </>;
}
