export type FinancePeriod = "month" | "30days" | "year";
export type FinancePoint = {
  date: string; received_minor: number; spent_minor: number; net_minor: number; cumulative_minor: number;
};
export type FinanceCategory = { id: string; label: string; total_minor: number | null; connected: boolean };
export type FinanceSummary = {
  period: FinancePeriod; from: string; to: string; currency: "GHS";
  received_minor: number; spent_minor: number; net_minor: number; received_count: number; spent_count: number;
  series: FinancePoint[]; income_sources: FinanceCategory[]; expense_categories: FinanceCategory[];
  payment_methods: { id: string; total_minor: number }[];
  recent_activity: { id: string; date: string; label: string; category: string; direction: "in" | "out"; amount_minor: number; register: "sales" | "salaries" }[];
  scope: string; updated_at: string;
};

export const financePeriods = [
  { id: "year", label: "This year" }, { id: "month", label: "This month" }, { id: "30days", label: "Last 30 days" },
] as const;

export function financeDate(value: string, monthOnly = false): string {
  return new Intl.DateTimeFormat("en-GH", {
    ...(monthOnly ? {} : { day: "numeric" }), month: "short", timeZone: "Africa/Accra",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function financeRange(from: string, to: string): string {
  return from.slice(0, 4) === to.slice(0, 4)
    ? `${financeDate(from)} – ${financeDate(to)}, ${to.slice(0, 4)}`
    : `${financeDate(from)} ${from.slice(0, 4)} – ${financeDate(to)} ${to.slice(0, 4)}`;
}

export function chartDomain(values: number[], signed = false) {
  const low = signed ? Math.min(0, ...values) : 0;
  const high = Math.max(0, ...values);
  const span = high - low || 10000;
  const rawStep = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map(value => value * magnitude).find(value => value >= rawStep) ?? magnitude * 10);
  const min = Math.floor(low / step) * step;
  const max = high === low ? min + step * 4 : Math.ceil(high / step) * step;
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => max - index * step);
  return { min, max, ticks };
}

export const axisMoney = (minor: number) => new Intl.NumberFormat("en-GH", {
  notation: "compact", maximumFractionDigits: Math.abs(minor) < 1000 ? 2 : 1,
}).format(minor / 100);
