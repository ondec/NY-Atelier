"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { axisMoney, chartDomain, financeDate, type FinanceCategory, type FinancePoint, type FinancePeriod } from "@/lib/finance-overview";
import { saleMoney } from "@/lib/studio-sales";

const chart = { left: 54, right: 680, top: 18, bottom: 210 };
const xAt = (index: number, length: number) => chart.left + (chart.right - chart.left) * index / Math.max(1, length - 1);

function useChartSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, style: { "--finance-axis-size": `${Math.max(11, Math.min(36, 12 * 700 / width))}px` } as CSSProperties };
}

export function CashFlowChart({ series, period, empty }: { series: FinancePoint[]; period: FinancePeriod; empty: boolean }) {
  const id = useId();
  const size = useChartSize();
  const [selected, setSelected] = useState<number>();
  const domain = chartDomain(series.map(point => point.cumulative_minor), true);
  const yAt = (value: number) => chart.bottom - (value - domain.min) / (domain.max - domain.min) * (chart.bottom - chart.top);
  const points = series.map((point, index) => ({ ...point, x: xAt(index, series.length), y: yAt(point.cumulative_minor) }));
  const line = points.map(point => `${point.x},${point.y}`).join(" ");
  const area = points.length ? `${points[0].x},${yAt(0)} ${line} ${points.at(-1)!.x},${yAt(0)}` : "";
  const active = points[selected ?? points.length - 1];
  return <div className="finance-chart" {...size}>
    <svg viewBox="0 0 700 246" role="img" aria-labelledby={id}>
      <title id={id}>{`Cumulative recorded cash movement in GHS. ${empty ? "No receipts or spending in this period." : `Closing movement ${saleMoney(points.at(-1)?.cumulative_minor ?? 0)}.`}`}</title>
      {domain.ticks.map(value => <g key={value}><line x1={chart.left} x2={chart.right} y1={yAt(value)} y2={yAt(value)} className={value === 0 ? "finance-chart-zero" : "finance-chart-grid"}/><text x="42" y={yAt(value) + 4} textAnchor="end" className="finance-axis">{axisMoney(value)}</text></g>)}
      {!empty && <polygon points={area} className="finance-area"/>}
      <polyline points={line} className="finance-line"/>
      {points.map((point, index) => <g key={point.date}>
        {(index % Math.max(1, Math.ceil(points.length / 7)) === 0 || index === points.length - 1) && <text x={point.x} y="237" textAnchor="middle" className="finance-axis">{financeDate(point.date, period === "year")}</text>}
        {!empty && <circle cx={point.x} cy={point.y} r="3.5" className="finance-dot"/>}
      </g>)}
      {!empty && active && <g><line x1={active.x} x2={active.x} y1={chart.top} y2={chart.bottom} className="finance-crosshair"/><circle cx={active.x} cy={active.y} r="5" className="finance-dot"/></g>}
    </svg>
    {empty ? <p className="finance-chart-message">No recorded cash movement in this period.</p> : <>
      <label className="finance-chart-explorer"><span>{active && financeDate(active.date, period === "year")} <strong>{active && saleMoney(active.cumulative_minor)}</strong></span><input type="range" min="0" max={Math.max(0, points.length - 1)} value={selected ?? points.length - 1} onChange={event => setSelected(Number(event.target.value))} aria-label="Explore cash flow by period" aria-valuetext={active ? `${financeDate(active.date, period === "year")}: cumulative movement ${saleMoney(active.cumulative_minor)}, received ${saleMoney(active.received_minor)}, spent ${saleMoney(active.spent_minor)}` : undefined}/></label>
    </>}
  </div>;
}

export function IncomeSpendingChart({ series, period, empty }: { series: FinancePoint[]; period: FinancePeriod; empty: boolean }) {
  const id = useId();
  const size = useChartSize();
  const domain = chartDomain(series.flatMap(point => [point.received_minor, point.spent_minor]));
  const yAt = (value: number) => chart.bottom - value / domain.max * (chart.bottom - chart.top);
  const column = (chart.right - chart.left) / Math.max(1, series.length);
  return <div className="finance-chart finance-bars" {...size}>
    <svg viewBox="0 0 700 246" role="img" aria-labelledby={id}>
      <title id={id}>{`Money received and recorded spending in GHS by ${period === "year" ? "month" : "day"}.${empty ? " No transactions in this period." : " Exact values are available in the data table."}`}</title>
      {domain.ticks.map(value => <g key={value}><line x1={chart.left} x2={chart.right} y1={yAt(value)} y2={yAt(value)} className="finance-chart-grid"/><text x="42" y={yAt(value) + 4} textAnchor="end" className="finance-axis">{axisMoney(value)}</text></g>)}
      {series.map((point, index) => <g key={point.date}>
        <rect x={chart.left + index * column + column * .12} y={yAt(point.received_minor)} width={column * .34} height={chart.bottom - yAt(point.received_minor)} rx="2" className="finance-bar-in"><title>{`${financeDate(point.date, period === "year")}: received ${saleMoney(point.received_minor)}`}</title></rect>
        <rect x={chart.left + index * column + column * .54} y={yAt(point.spent_minor)} width={column * .34} height={chart.bottom - yAt(point.spent_minor)} rx="2" className="finance-bar-out"><title>{`${financeDate(point.date, period === "year")}: spent ${saleMoney(point.spent_minor)}`}</title></rect>
        {(index % Math.max(1, Math.ceil(series.length / 6)) === 0 || index === series.length - 1) && <text x={chart.left + (index + .5) * column} y="237" textAnchor="middle" className="finance-axis">{financeDate(point.date, period === "year")}</text>}
      </g>)}
    </svg>
    {empty && <p className="finance-chart-message">Recorded payments will appear here as they come in.</p>}
  </div>;
}

export function CategoryChart({ categories, total, kind }: { categories: FinanceCategory[]; total: number; kind: "income" | "expenses" }) {
  const id = useId();
  const slices = categories.filter(row => row.total_minor !== null && row.total_minor > 0);
  const circumference = 2 * Math.PI * 58;
  return <div className="finance-breakdown">
    <div className="finance-donut"><svg viewBox="0 0 160 160" role="img" aria-labelledby={id}>
      <title id={id}>{`${kind === "income" ? "Money received by service" : "Recorded spending by category"}: ${saleMoney(total)}. ${slices.map(row => `${row.label}: ${saleMoney(row.total_minor!)}`).join(". ")}${!total ? " No recorded payments in this period." : ""}`}</title>
      <circle cx="80" cy="80" r="58" className="finance-donut-track"/>
      {slices.map((row, index) => {
        const offset = slices.slice(0, index).reduce((sum, item) => sum + item.total_minor!, 0) / total * circumference;
        return <circle key={row.id} cx="80" cy="80" r="58" fill="none" strokeWidth="15" strokeDasharray={`${row.total_minor! / total * circumference} ${circumference}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" className={`finance-slice finance-slice-${kind === "expenses" ? "out" : index % 3}`}><title>{`${row.label}: ${saleMoney(row.total_minor!)}`}</title></circle>;
      })}
      <text x="80" y="74" textAnchor="middle" className="finance-donut-label">{kind === "income" ? "Received" : "Spent"}</text>
      <text x="80" y="96" textAnchor="middle" className="finance-donut-total">{axisMoney(total)}</text>
    </svg><span className="finance-donut-currency">GHS</span></div>
    <ul className="finance-category-list">{categories.map((row, index) => <li key={row.id}><div><i className={`finance-key ${!row.connected ? "is-unconnected" : kind === "expenses" ? "is-out" : `is-${index % 3}`}`} aria-hidden="true"/><span>{row.label}</span></div><strong>{row.total_minor === null ? <span className="finance-not-connected">Not connected</span> : saleMoney(row.total_minor)}</strong>{row.connected && total > 0 && <small>{Math.round(row.total_minor! / total * 100)}% of recorded {kind}</small>}</li>)}</ul>
  </div>;
}
