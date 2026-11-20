export type SalaryLine = { description: string; quantity: number | null; amount_minor: number; order_reference: string | null };
export type SalaryEntry = { id: string; name: string; lines: SalaryLine[]; adjustment_minor: number; adjustment_reason: string | null };
export type SalaryPayment = { id: string; entry_id: string; amount_minor: number; paid_on: string; method: string; reference: string; recorded_by: string };
export type SalaryBatch = { id: string; label: string; period_start: string; period_end: string; prepared_by: string; status: "draft" | "submitted" | "returned" | "approved"; version: number; entries: SalaryEntry[]; total_minor: number; paid_minor: number; payment_status: string; approved_by: string | null; approved_at: string | null; payments: SalaryPayment[]; events?: { id: number; action: string; actor: string; note: string | null; created_at: string }[] };
export type SalaryInput = Pick<SalaryBatch, "label" | "period_start" | "period_end" | "prepared_by" | "entries">;
export const salaryChanged = "ny-salaries-changed";
export const salaryHref = (id?: string) => `/?section=finances&finance=salaries${id ? `&salary=${id}` : ""}`;
export const salaryMoney = (minor: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(minor / 100);
export const salaryDate = (date: string) => new Intl.DateTimeFormat("en-GH", {day:"numeric",month:"short",year:"numeric", timeZone:"Africa/Accra"}).format(new Date(date.length === 10 ? `${date}T12:00:00Z` : date.replace(" ", "T") + (date.includes("T") ? "" : "Z")));
export const entryTotal = (entry: SalaryEntry) => entry.lines.reduce((sum, line) => sum + line.amount_minor, 0) + entry.adjustment_minor;
export const entryPaid = (batch: SalaryBatch, entry: SalaryEntry) => batch.payments.filter(payment => payment.entry_id === entry.id).reduce((sum,payment)=>sum+payment.amount_minor,0);
export const salaryStatus = (status: string) => ({ draft:"Draft",submitted:"Awaiting approval",returned:"Returned for correction",approved:"Approved" }[status] ?? status);
export async function salaryApi<T>(id?: string, input?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/staff-salaries${id ? `?id=${id}` : ""}`, { method:input ? id ? "PATCH" : "POST" : "GET", cache:"no-store", headers:input ? {"Content-Type":"application/json"} : undefined, body:input ? JSON.stringify(input) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message ?? "Could not save this salary batch.");
  return data;
}
