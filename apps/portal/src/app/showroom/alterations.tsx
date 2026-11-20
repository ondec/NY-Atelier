"use client";

import { orderEndpoint } from "@/lib/studio-endpoints";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "@/components/icons";
import type { DemoOrder } from "@/lib/orders";
import CreateStaffOrder from "../create-staff-order";
import { InventoryDrawer } from "../catalogue-editor";
import ServiceOrderDesk from "../service-order-desk";
import OrderDetailsContent from "../order-details-content";

export default function ShowroomAlterations({ customerId, onBack }: { customerId?: number; onBack: () => void }) {
  const [orders, setOrders] = useState<DemoOrder[]>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
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
      if (!response.ok || !Array.isArray(payload.orders)) throw new Error(payload.message ?? "Could not load alteration orders.");
      setOrders(payload.orders.filter((order: DemoOrder) => order.category === "Alterations"));
      setError("");
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  return <>
    <div className="showroom-intro"><div><button type="button" className="showroom-home-button" onClick={onBack}><ArrowLeft size={18} />Back to NY Studio</button><h1>Alterations.</h1></div><CreateStaffOrder category="Alterations" preferredCustomerId={customerId} onCreated={(reference) => {
      setNotice("Alteration order " + reference + " created.");
      setRevision((value) => value + 1);
    }} /></div>
    <p className="showroom-alterations-intro">Record the garments, agreed adjustments and completion date. Link an existing customer fitting when measurements are needed.</p>
    {notice && <p className="inventory-message" role="status">{notice}</p>}
    <div className="showroom-order-desk">
      {error ? <p role="alert" className="collection-error">{error} <button className="showroom-secondary" onClick={() => setRevision((value) => value + 1)}>Retry</button></p> : !orders ? <p role="status">Loading alterations…</p> : <ServiceOrderDesk section="alterations" orders={orders} unavailable={false} onOpenOrder={openOrder} />}
    </div>
    {selectedOrder && <InventoryDrawer label={`Alteration order ${selectedOrder.reference}`} onClose={closeOrder}>
      <div className="showroom-order-details">
        <div className="inventory-form-title"><div><p className="showroom-kicker">ALTERATION ORDER</p><h2>{selectedOrder.reference}</h2><p>{selectedOrder.customer_name}</p></div><button type="button" aria-label="Close order details" onClick={closeOrder}><X size={20} /></button></div>
        {detailLoading ? <p role="status">Loading the latest order…</p> : detailError ? <p role="alert">{detailError} <button className="inventory-quiet-button" onClick={() => openOrder(selectedOrder)}>Retry</button></p> : <OrderDetailsContent order={selectedOrder} showWorkspaceLinks={false} onUpdated={(order) => { setSelectedOrder(order); setOrders((rows) => rows?.map((row) => row.reference === order.reference ? order : row)); }} />}
      </div>
    </InventoryDrawer>}
  </>;
}
