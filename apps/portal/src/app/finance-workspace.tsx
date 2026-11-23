import { ArrowRight } from "@/components/icons";
import Link from "next/link";
import FinanceRegister from "./finance-register";
import FinanceDashboard from "./finance-overview";
import { financePages, type FinancePageId } from "@/lib/finance-navigation";

export { financePages, financeHref, financeNavigation, resolveFinancePage, type FinancePageId } from "@/lib/finance-navigation";

export function FinanceOverview({ canViewReports = true }: { canViewReports?: boolean }) {
  return <FinanceDashboard canViewReports={canViewReports}/>;
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
    <Link prefetch={false} href="/?section=finances" className="text-link finance-back-link">Finance overview <ArrowRight size={16} /></Link>
  </>;
}
