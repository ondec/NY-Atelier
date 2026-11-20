"use client";

import { useState } from "react";
import { Search, X } from "@/components/icons";
import StudioSalesRegister from "./studio-sales-register";
import StudioReceipt from "./studio-receipt";
import { InventoryDrawer } from "./catalogue-editor";
import type { Receipt } from "@/lib/studio-sales";
import RecurringBills from "./recurring-bills";

export default function FinanceRegister({ id, initialType }: { id: "sales" | "bills"; initialType?: string }) {
  const [receipt, setReceipt] = useState<Receipt>();
  const [type, setType] = useState(initialType ?? "all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const billTypes = [{ id: "all", label: "All records" }, { id: "expenses", label: "One-off expenses" }, { id: "recurring", label: "Recurring bills" }, { id: "debts", label: "Debts & obligations" }];
  const paymentTypes = [{ id: "all", label: "All records" }, { id: "payments", label: "Payments" }, { id: "outstanding", label: "Outstanding balances" }, { id: "refunds", label: "Refunds" }];
  const toolbar = <div className="inventory-toolbar finance-register-toolbar">
    <label className="inventory-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{id === "bills" ? "Search bills and expenses" : "Search sales and payments"}</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={id === "bills" ? "Search bill, category or commitment" : "Search payment, order or customer"} /></label>
    <select aria-label={id === "bills" ? "Filter spending type" : "Filter payment type"} value={type} onChange={event => setType(event.target.value)}>{(id === "bills" ? billTypes : paymentTypes).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
    {id === "bills" && <select aria-label="Filter bill due date" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All due dates</option><option value="upcoming">Upcoming</option><option value="overdue">Overdue</option></select>}
    {(search || type !== "all" || status !== "all") && <button type="button" className="inventory-quiet-button" onClick={() => { setSearch(""); setType("all"); setStatus("all"); }}>Clear filters</button>}
  </div>;
  if (id === "bills") return <RecurringBills merged recordType={type} search={search} dueStatus={status} toolbar={toolbar} />;
  return <>
    <div className="page-heading"><div><h1>Sales & payments.</h1><p>Customer payments, outstanding balances and refunds across all services.</p></div></div>
    <section className="panel full-panel"><div className="panel-heading"><div><div className="eyebrow">CUSTOMER PAYMENTS</div><h2>{paymentTypes.find(item => item.id === type)?.label ?? "All records"}</h2></div></div>{toolbar}
      {type === "all" || type === "payments" ? <StudioSalesRegister key={search} externalSearch={search} onOpen={setReceipt} /> : <p className="empty-state">{type === "refunds" ? "No Studio refunds have been recorded." : "Studio checkout records full payments. There are no outstanding Studio balances."}</p>}

    </section>
    {receipt && <InventoryDrawer label="Sale receipt" onClose={() => setReceipt(undefined)}><button className="studio-receipt-close" aria-label="Close receipt" onClick={() => setReceipt(undefined)}><X size={20}/></button><StudioReceipt receipt={receipt}/></InventoryDrawer>}
  </>;
}
