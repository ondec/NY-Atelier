import { ArrowRight } from "@/components/icons";
import Link from "next/link";
import FinanceRegister from "./finance-register";
import { financePages, financeHref, type FinancePageId } from "@/lib/finance-navigation";

export { financePages, financeHref, financeNavigation, resolveFinancePage, type FinancePageId } from "@/lib/finance-navigation";

export function FinanceOverview() {
  return <>
    <div className="eyebrow">FINANCES / OVERVIEW</div>
    <div className="page-heading"><div><h1>Finances.</h1><p>Manage day-to-day operations and payroll.</p></div><Link className="inventory-quiet-button" href={financeHref("reports")}>View reports <ArrowRight size={16} /></Link></div>
    <section className="finance-overview-section"><div className="eyebrow">OPERATIONS</div><div className="offering-grid finance-overview-cards">{financePages.filter(page => page.id === "sales" || page.id === "bills").map(page => <Link className="offering-card" key={page.id} href={financeHref(page.id)}><strong>{page.title}</strong><span>{page.intro}</span><ArrowRight size={18} /></Link>)}</div></section>
    <section className="finance-overview-section"><div className="eyebrow">PAYROLL</div><div className="offering-grid finance-overview-cards"><Link className="offering-card" href={financeHref("salaries")}><strong>Salary approvals</strong><span>Prepare tailor earnings, review approvals and record payments.</span><ArrowRight size={18} /></Link></div></section>
  </>;
}

export default function FinanceWorkspace({ id, initialType }: { id: FinancePageId; initialType?: string }) {
  const page = financePages.find(item => item.id === id)!;
  return <>
    <div className="eyebrow">FINANCES / {id === "salaries" ? "PAYROLL" : id === "reports" ? "REPORTS" : "OPERATIONS"}</div>
    {id === "bills" || id === "sales" ? <FinanceRegister id={id} initialType={initialType} /> : <>
      <div className="page-heading"><div><h1>{page.title}.</h1><p>{page.intro}</p></div></div>
      <section className="panel orders-panel"><div className="panel-heading"><h2>Financial reports</h2></div><p className="empty-state">Reports will use connected financial records once payment and expense tracking are available.</p></section>
      <div className="offering-grid finance-report-options">{["Income & expenses", "Sales by service", "Outstanding obligations", "Refund history"].map(title => <div className="offering-card" key={title}><strong>{title}</strong><span>Awaiting records</span></div>)}</div>
    </>}
    <Link href="/?section=finances" className="text-link finance-back-link">Finance overview <ArrowRight size={16} /></Link>
  </>;
}
