"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import type { DataGroup, DataItem, Timeline } from "vis-timeline";
import type { MomentInput } from "moment";
import { consultationDay, consultationGanttRows, type StaffConsultation } from "@/lib/consultations";
import { statusTone } from "@/lib/status";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

type GanttRow = ReturnType<typeof consultationGanttRows>[number];
type GanttItem = DataItem & { requestId: string; description: string; tone: string };
const day = 86_400_000;
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(date);
const formatTime = (at: string) => new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" }).format(new Date(at));

export default function ConsultationGantt({ rows, from, to, onOpen }: { rows: StaffConsultation[]; from: string; to: string; onOpen: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const timeline = useRef<Timeline | null>(null);
  const open = useRef(onOpen);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rangeLabel, setRangeLabel] = useState("");
  const [jumpDate, setJumpDate] = useState(() => consultationDay(new Date()));
  const data = JSON.stringify(consultationGanttRows(rows, from, to));
  useEffect(() => { open.current = onOpen; }, [onOpen]);

  useEffect(() => {
    let disposed = false;
    let instance: Timeline | null = null;
    const records: GanttRow[] = JSON.parse(data);
    async function load() {
      try {
        const [{ Timeline }, { default: moment }] = await Promise.all([import("vis-timeline"), import("moment")]);
        if (disposed || !host.current) return;
        const groups: DataGroup[] = records.map(row => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "consultation-gantt-row-button";
          button.setAttribute("aria-label", `View consultation: ${row.purpose}`);
          const name = document.createElement("strong");
          name.textContent = row.purpose;
          const customer = document.createElement("span");
          customer.textContent = row.customer;
          button.append(name, customer);
          button.addEventListener("click", () => open.current(row.id));
          return { id: row.id, content: button };
        });
        const items: GanttItem[] = records.flatMap(row => {
          const tone = statusTone(row.status);
          const markers: GanttItem[] = row.appointments.map((slot, index) => ({
            id: `${row.id}:slot:${index}`, group: row.id, requestId: row.id,
            start: slot.at, type: "point", content: `${slot.label} · ${formatTime(slot.at)}`,
            description: `${row.purpose}: ${slot.label.toLowerCase()} for ${formatDate(new Date(slot.at))}, ${formatTime(slot.at)} (Accra)`,
            className: `ny-gantt-${tone}`, tone,
          }));
          return row.receivedAt ? [{
            id: `${row.id}:span`, group: row.id, requestId: row.id,
            start: row.receivedAt, end: row.end, type: "range", content: row.status,
            description: `${row.purpose}: request received ${formatDate(new Date(row.receivedAt))}, consultation ${formatDate(new Date(row.end))}`,
            className: `ny-gantt-${tone} ny-gantt-span`, tone,
          }, ...markers] : markers;
        });
        instance = new Timeline(host.current, items, groups, {
          editable: false, groupEditable: false, selectable: false,
          stack: true, orientation: "top", showCurrentTime: true,
          margin: { item: { horizontal: 12, vertical: 9 }, axis: 16 },
          zoomMin: day, zoomMax: day * 366, zoomKey: "ctrlKey", showTooltips: false,
          moment: (value: MomentInput) => moment(value).utc(),
          template: (item?: GanttItem) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "consultation-gantt-item-button";
            if (item) {
              button.textContent = item.content;
              button.dataset.tone = item.tone;
              button.title = item.description;
              button.setAttribute("aria-label", item.description);
              button.addEventListener("click", () => open.current(item.requestId));
            }
            return button;
          },
        });
        timeline.current = instance;
        const reportRange = () => {
          if (!instance || disposed) return;
          const range = instance.getWindow();
          setRangeLabel(`${formatDate(range.start)} – ${formatDate(range.end)}`);
        };
        instance.on("rangechanged", reportRange);
        if (items.length) instance.fit({ animation: false });
        else instance.setWindow(Date.now() - 3 * day, Date.now() + 11 * day, { animation: false });
        reportRange();
        setLoading(false);
        setError(false);
      } catch {
        if (!disposed) { setError(true); setLoading(false); }
      }
    }
    void load();
    return () => { disposed = true; instance?.destroy(); timeline.current = null; };
  }, [data]);

  function move(direction: number) {
    const chart = timeline.current;
    if (!chart) return;
    const range = chart.getWindow();
    const distance = range.end.getTime() - range.start.getTime();
    chart.setWindow(range.start.getTime() + distance * direction, range.end.getTime() + distance * direction, { animation: false });
  }
  function showDays(count: number, center?: number) {
    const chart = timeline.current;
    if (!chart) return;
    const range = chart.getWindow();
    const middle = center ?? (range.start.getTime() + range.end.getTime()) / 2;
    chart.setWindow(middle - count * day / 2, middle + count * day / 2, { animation: false });
  }
  function jump(value: string) {
    setJumpDate(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) showDays(7, new Date(`${value}T12:00:00Z`).getTime());
  }
  return <div className="consultation-gantt">
    <div className="consultation-calendar-heading"><div><h3>Appointment Gantt</h3><p className="consultation-muted" aria-live="polite">{rangeLabel || "Loading dates…"} · Accra time</p></div><div className="inventory-actions consultation-calendar-controls">
      <button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => move(-1)} aria-label="Previous Gantt period"><ChevronLeft size={16} />Previous</button>
      <button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => showDays(7, Date.now())}>Today</button>
      <button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => move(1)} aria-label="Next Gantt period">Next<ChevronRight size={16} /></button>
    </div></div>
    <div className="consultation-gantt-controls"><div className="inventory-actions" role="group" aria-label="Gantt timescale"><button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => showDays(7)}>Week</button><button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => showDays(30)}>Month</button><button type="button" className="inventory-quiet-button" disabled={loading || error} onClick={() => timeline.current?.fit({ animation: false })}>Fit all requests</button></div><label className="consultation-date-filter">Jump to<input type="date" aria-label="Jump to Gantt date" value={jumpDate} onInput={event => jump(event.currentTarget.value)} onChange={event => jump(event.target.value)} /></label></div>
    <p className="consultation-muted">Bars show time from request received to appointment, rather than meeting duration. Dots mark requested, suggested or confirmed times. Open any row or marker for details.</p>
    {loading && <p role="status" className="consultation-muted">Loading Gantt chart…</p>}
    {error && <p role="alert" className="inventory-message">The Gantt chart could not load. Please use List or Calendar, or refresh this page.</p>}
    <div className="consultation-gantt-chart" ref={host} aria-label="Appointment Gantt timeline" />
  </div>;
}
