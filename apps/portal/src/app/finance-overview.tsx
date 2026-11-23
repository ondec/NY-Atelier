"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, RefreshCw } from "@/components/icons";
import { financeHref, financePages } from "@/lib/finance-navigation";
import { financeDate, financeRange, financePeriods, type FinancePeriod, type FinanceSummary } from "@/lib/finance-overview";
import { paymentMethods, saleMoney } from "@/lib/studio-sales";
import { CashFlowChart, CategoryChart, IncomeSpendingChart } from "./finance-charts";
import "./finance-overview.css";

type Result = { period: FinancePeriod; revision: number; data?: FinanceSummary; error?: string };

export default function FinanceDashboard({ canViewReports = true }: { canViewReports?: boolean }) {
  const [period, setPeriod] = useState<FinancePeriod>("year");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result>();
  const current = result?.period === period && result.revision === revision ? result : undefined;
  const data = current?.data;
  const busy = !current;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/finance-overview?period=${period}`, {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again to view finances." : payload.message ?? "Financial records are unavailable. Please try again.");
        if (!controller.signal.aborted) setResult({ period, revision, data: payload });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ period, revision, error: error instanceof Error ? error.message : "Financial records are unavailable. Please try again." });
      }
    }
    void load();
    return () => controller.abort();
  }, [period, revision]);

  const empty = !!data && data.received_count === 0 && data.spent_count === 0;
  const periodLabel = financePeriods.find(item => item.id === period)!.label;
  return <div className="finance-dashboard" aria-busy={busy}>
    <div className="eyebrow">FINANCES / OVERVIEW</div>
    <div className="page-heading finance-dashboard-heading"><div><h1>Money, in view.</h1><p>What came in, what went out, and where it came from.</p></div><Link href={financeHref("sales")} className="inventory-quiet-button">Sales & payments <ArrowRight size={16}/></Link></div>
    <div className="finance-dashboard-toolbar">
      <div className="finance-period-context"><strong>{data ? financeRange(data.from, data.to) : periodLabel}</strong><span>Cash basis · GHS</span></div>
      <div className="finance-dashboard-controls"><label className="finance-period-select"><CalendarDays size={17} aria-hidden="true"/><span className="sr-only">Reporting period</span><select value={period} onChange={event => setPeriod(event.target.value as FinancePeriod)}>{financePeriods.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button type="button" className="inventory-quiet-button finance-refresh" aria-label="Refresh financial overview" disabled={busy} onClick={() => setRevision(value => value + 1)}><RefreshCw size={17}/></button></div>
    </div>
    {current?.error && <div className="finance-error" role="alert"><strong>We couldn’t load your finances.</strong><p>{current.error}</p><button className="inventory-quiet-button" type="button" onClick={() => setRevision(value => value + 1)}>Try again <RefreshCw size={16}/></button></div>}
    <section className="finance-totals" aria-label="Cash totals for the selected period">
      <div className="panel finance-total"><span>Money received</span><strong>{data ? saleMoney(data.received_minor) : "—"}</strong><small>{data ? `${data.received_count} confirmed ${data.received_count === 1 ? "payment" : "payments"}` : "Confirmed payments"}</small><span className="finance-total-rule is-in"/></div>
      <div className="panel finance-total"><span>Recorded spending</span><strong>{data ? saleMoney(data.spent_minor) : "—"}</strong><small>{data ? `${data.spent_count} salary ${data.spent_count === 1 ? "payment" : "payments"}` : "Recorded payments only"}</small><span className="finance-total-rule is-out"/></div>
      <div className="panel finance-total"><span>Net cash movement</span><strong>{data ? saleMoney(data.net_minor) : "—"}</strong><small>Received less recorded spending</small><span className="finance-total-rule is-net"/></div>
    </section>
    {busy && <section className="panel finance-loading" role="status">Loading financial records…</section>}
    {data && <>
      <section className="panel finance-cash-panel" aria-labelledby="finance-cash-title">
        <div className="finance-panel-heading"><div><h2 id="finance-cash-title">Cash flow</h2><p>Cumulative movement for the selected period</p></div><span className="finance-panel-period">{periodLabel}</span></div>
        <div className="finance-cash-body"><CashFlowChart key={period + revision} series={data.series} period={period} empty={empty}/><dl className="finance-cash-totals"><div><dt><i className="finance-key is-in"/>Money in</dt><dd>{saleMoney(data.received_minor)}</dd></div><div><dt><i className="finance-key is-out"/>Money out</dt><dd>{saleMoney(data.spent_minor)}</dd></div><div className="finance-cash-net"><dt>Net movement</dt><dd>{saleMoney(data.net_minor)}</dd></div><p>Movement only. Opening cash and bank balances are excluded.</p></dl></div>
      </section>
      <div className="finance-chart-grid-layout">
        <section className="panel finance-income-panel" aria-labelledby="finance-income-title"><div className="finance-panel-heading"><div><h2 id="finance-income-title">Income & spending</h2><p>Confirmed cash transactions over time</p></div></div><div className="finance-chart-legend"><span><i className="finance-key is-in"/>Money received <strong>{saleMoney(data.received_minor)}</strong></span><span><i className="finance-key is-out"/>Recorded spending <strong>{saleMoney(data.spent_minor)}</strong></span></div><IncomeSpendingChart series={data.series} period={period} empty={empty}/></section>
        <section className="panel" aria-labelledby="finance-sources-title"><div className="finance-panel-heading"><div><h2 id="finance-sources-title">Where money comes from</h2><p>Received payments by service</p></div></div><CategoryChart categories={data.income_sources} total={data.received_minor} kind="income"/><div className="finance-panel-footer"><Link className="text-link" href={financeHref("sales")}>View payments <ArrowRight size={15}/></Link></div></section>
        <section className="panel" aria-labelledby="finance-expenses-title"><div className="finance-panel-heading"><div><h2 id="finance-expenses-title">Where money goes</h2><p>Recorded spending by category</p></div></div><CategoryChart categories={data.expense_categories} total={data.spent_minor} kind="expenses"/><p className="finance-category-note">Rent, materials, utilities and other expense payments are not connected yet.</p><div className="finance-panel-footer"><Link className="text-link" href={financeHref("salaries")}>View salary payments <ArrowRight size={15}/></Link></div></section>
        <section className="panel" aria-labelledby="finance-recent-title"><div className="finance-panel-heading"><div><h2 id="finance-recent-title">Recent cash activity</h2><p>Latest recorded payments in this period</p></div></div>{data.recent_activity.length ? <ul className="finance-activity">{data.recent_activity.map(row => <li key={row.id}><Link href={financeHref(row.register)}><span className={`finance-activity-icon ${row.direction === "out" ? "is-out" : ""}`}>{row.direction === "in" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span><span className="finance-activity-description"><strong>{row.label}</strong><small>{row.category} · {financeDate(row.date)}</small></span><strong className={`finance-activity-amount ${row.direction === "out" ? "is-out" : ""}`}>{row.direction === "in" ? "+" : "−"}{saleMoney(row.amount_minor)}</strong></Link></li>)}</ul> : <div className="finance-activity-empty"><p>No cash activity recorded in this period.</p><Link className="text-link" href={financeHref("sales")}>Open sales & payments <ArrowRight size={15}/></Link></div>}</section>
      </div>
      {data.payment_methods.length > 0 && <section className="finance-payment-methods" aria-label="Money received by payment method"><span>Received through</span>{data.payment_methods.map(method => <div key={method.id}><span>{paymentMethods.find(item => item.id === method.id)?.label ?? "Other"}</span><strong>{saleMoney(method.total_minor)}</strong></div>)}</section>}
      <details className="finance-data-table"><summary>View chart data</summary><div className="table-wrap"><table><caption className="sr-only">Cash transactions for {periodLabel.toLowerCase()}</caption><thead><tr><th>{period === "year" ? "Month" : "Date"}</th><th>Received</th><th>Spent</th><th>Net movement</th><th>Cumulative movement</th></tr></thead><tbody>{data.series.map(point => <tr key={point.date}><th scope="row">{financeDate(point.date, period === "year")}</th><td>{saleMoney(point.received_minor)}</td><td>{saleMoney(point.spent_minor)}</td><td>{saleMoney(point.net_minor)}</td><td>{saleMoney(point.cumulative_minor)}</td></tr>)}</tbody></table></div></details>
      <p className="finance-coverage">{data.scope} Net cash movement is not a profit figure.</p>
      <p className="finance-updated">Updated {new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" }).format(new Date(data.updated_at))} · Accra</p>
    </>}
    <nav className="finance-workspace-links" aria-label="Finance workspaces">{financePages.filter(page => page.id !== "sales" && (page.id !== "reports" || canViewReports)).map(page => <Link className="inventory-quiet-button" href={financeHref(page.id)} key={page.id}>{page.title}<ArrowRight size={15}/></Link>)}</nav>
  </div>;
}
