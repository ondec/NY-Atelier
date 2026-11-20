export const financePages = [
  { id: "sales", title: "Sales & payments", intro: "Customer payments, outstanding balances and refunds across all services." },
  { id: "bills", title: "Bills & expenses", intro: "Business spending, recurring bills and amounts owed, in one place." },
  { id: "salaries", title: "Salary approvals", intro: "Weekly tailor earnings, manager approvals and payment records." },
  { id: "reports", title: "Reports", intro: "Review business income and spending over time." },
] as const;
export type FinancePageId = (typeof financePages)[number]["id"];
export const financeNavigation = [
  { label: "Operations", pages: ["sales", "bills"] },
  { label: "Payroll", pages: ["salaries"] },
] as const;
export const financeHref = (id: FinancePageId) => `/?section=finances&finance=${id}`;

export function resolveFinancePage(finance: string | string[] | undefined, bill: string | string[] | undefined): { id?: FinancePageId; type?: string } {
  if (bill === "recurring" || finance === "recurring") return { id: "bills", type: "recurring" };
  if (finance === "expenses") return { id: "bills", type: "expenses" };
  if (finance === "debts") return { id: "bills", type: "debts" };
  if (finance === "refunds") return { id: "sales", type: "refunds" };
  return { id: financePages.find(page => page.id === finance)?.id };
}
