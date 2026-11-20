"use client";

import StatusBadge from "./status-badge";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "@/components/icons";

type Bill = {
  id: string;
  name: string;
  category: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  nextDue: string;
  paidOn: string;
};

const storageKey = "ny-atelier-recurring-bills-draft-v1";

export default function RecurringBills({ merged = false, recordType = "all", search = "", dueStatus = "all", toolbar }: {
  merged?: boolean; recordType?: string; search?: string; dueStatus?: string; toolbar?: ReactNode;
}) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored)) queueMicrotask(() => setBills(stored));
    } catch { /* Ignore invalid browser draft data. */ }
  }, []);

  function createBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const bill: Bill = {
      id: crypto.randomUUID(), name: value("name"), category: value("category"),
      amount: Number(value("amount")), periodStart: value("periodStart"),
      periodEnd: value("periodEnd"), nextDue: value("nextDue"), paidOn: value("paidOn"),
    };
    const next = [bill, ...bills];
    setBills(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    form.reset();
    setFormOpen(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  const soonDate = new Date(`${today}T00:00:00Z`);
  soonDate.setUTCDate(soonDate.getUTCDate() + 7);
  const soon = soonDate.toISOString().slice(0, 10);
  const displayDate = (value: string) => value ? new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "—";
  const displayAmount = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(value);

  const visible = bills.filter(bill =>
    (recordType === "all" || recordType === "recurring") &&
    [bill.name, bill.category].some(value => value.toLowerCase().includes(search.trim().toLowerCase())) &&
    (dueStatus === "all" || (dueStatus === "overdue" ? bill.nextDue < today : bill.nextDue >= today))
  );
  const registerTitle = recordType === "expenses" ? "One-off expenses" : recordType === "debts" ? "Debts & obligations" : merged && recordType === "all" ? "All records" : "Recurring bills";
  const empty = recordType === "expenses" ? "Business expenses and supporting receipts will appear here once expense entry is connected." : recordType === "debts" ? "Loans, purchases on credit and other obligations will appear here once obligation entry is connected." : bills.length ? "No bills match these filters." : "No recurring bills yet. Add rent, utilities or another bill to start the register.";
  return <>
    {!merged && <div className="eyebrow">FINANCES / RECURRING BILLS</div>}
    <div className="page-heading"><div><h1>{merged ? "Bills & expenses." : "Recurring bills."}</h1><p>{merged ? "Business spending, recurring bills and amounts owed, in one place." : "Keep rent, utilities and other repeating commitments together."}</p></div>{(recordType === "all" || recordType === "recurring") && <button className="create-bill-button" type="button" onClick={() => setFormOpen(!formOpen)}>{formOpen ? <X size={17} /> : <Plus size={17} />}{formOpen ? "Close form" : "Add recurring bill"}</button>}</div>
    {formOpen && <section className="panel bill-form-panel"><div className="eyebrow">NEW BILL</div><h2>Record a recurring bill</h2><p className="portal-form-help">Enter a repeating expense, its amount and when it is due.</p><form onSubmit={createBill}><div className="bill-form-grid"><label>Bill name<input name="name" placeholder="e.g. Studio rent" required /></label><label>Category<select name="category" defaultValue="Rent"><option>Rent</option><option>Utilities</option><option>Other</option></select></label><label>Amount (GHS)<input name="amount" type="number" min="0" step="0.01" required /></label><label>Last paid on<input name="paidOn" type="date" /></label><label>Period from<input name="periodStart" type="date" required /></label><label>Period to<input name="periodEnd" type="date" required /></label><label>Next due<input name="nextDue" type="date" required /></label></div><div className="bill-form-actions"><span>Saved in this browser for the current prototype.</span><button type="submit">Save bill</button></div></form></section>}
    <section className="panel bill-list-panel"><div className="panel-heading"><div><div className="eyebrow">BILL REGISTER</div><h2>{registerTitle} <span className="heading-count">{visible.length}</span></h2></div></div>{toolbar}{visible.length ? <div className="table-wrap"><table className="order-table bill-table"><thead><tr><th>Bill</th><th>Category</th><th>Amount</th><th>Covered period</th><th>Next due</th><th>Last payment</th></tr></thead><tbody>{visible.map((bill) => <tr key={bill.id}><td className="order-reference"><strong>{bill.name}</strong></td><td><span className="service-pill">{bill.category}</span></td><td>{displayAmount(bill.amount)}</td><td>{displayDate(bill.periodStart)} – {displayDate(bill.periodEnd)}</td><td><div className="bill-due-cell">{displayDate(bill.nextDue)}<StatusBadge status={bill.nextDue < today ? "Overdue" : bill.nextDue === today ? "Due today" : bill.nextDue <= soon ? "Due soon" : "Upcoming"} /></div></td><td>{displayDate(bill.paidOn)}</td></tr>)}</tbody></table></div> : <div className="empty-state">{empty}</div>}</section>
  </>;
}
