import type { ConsultationRequest } from "../../../mobile/src/lib/consultation-types";

export type StaffConsultation = ConsultationRequest & {
  created_at?: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
};
export const consultationStatuses: Record<ConsultationRequest["status"], string> = {
  "awaiting-confirmation": "New request",
  "needs-alternatives": "Other times requested",
  "awaiting-customer": "Awaiting customer",
  confirmed: "Confirmed",
  "local-draft": "Draft",
};
export type ConsultationFilters = { search: string; status: string; method: string; service: string; from: string; to: string };

export function consultationSlots(row: ConsultationRequest) {
  if (row.status === "confirmed" && row.confirmedDate && row.confirmedTime) {
    return [{ date: row.confirmedDate, time: row.confirmedTime, label: "Confirmed" }];
  }
  if (row.status === "awaiting-customer" && row.options.length) {
    return row.options.map(slot => ({ ...slot, label: "Suggested" }));
  }
  return [{ date: row.preferredDate, time: row.preferredTime, label: "Requested" }];
}

export function filterConsultations(rows: StaffConsultation[], filters: ConsultationFilters) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter(row =>
    (!filters.status || row.status === filters.status) &&
    (!filters.method || row.method === filters.method) &&
    (!filters.service || row.purpose === filters.service) &&
    [row.id, row.purpose, row.notes, row.customer_name, row.customer_email, row.customer_phone, row.order_reference]
      .some(value => value?.toLowerCase().includes(query)) &&
    consultationSlots(row).some(slot => (!filters.from || slot.date >= filters.from) && (!filters.to || slot.date <= filters.to))
  ).sort((a, b) => {
    const left = consultationSlots(a)[0];
    const right = consultationSlots(b)[0];
    return `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`) || a.id.localeCompare(b.id);
  });
}

export const consultationDay = (date: Date) => date.toISOString().slice(0, 10);
export function shiftConsultationMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return consultationDay(date).slice(0, 7);
}

export function consultationGanttRows(rows: StaffConsultation[], from = "", to = "") {
  return rows.flatMap(row => {
    const slots = consultationSlots(row).filter(slot => (!from || slot.date >= from) && (!to || slot.date <= to));
    if (!slots.length) return [];
    const appointments = slots.map(slot => ({ ...slot, at: `${slot.date}T${slot.time}:00Z` }));
    const end = appointments.map(slot => slot.at).sort().at(-1)!;
    const received = row.created_at ? new Date(row.created_at.includes("T") ? row.created_at : `${row.created_at.replace(" ", "T")}Z`) : null;
    return [{
      id: row.id, purpose: row.purpose, customer: row.customer_name ?? "Customer not linked",
      status: consultationStatuses[row.status], appointments,
      receivedAt: received && Number.isFinite(received.getTime()) && received.getTime() < new Date(end).getTime() ? received.toISOString() : null,
      end,
    }];
  });
}
export function calendarDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = new Date(first);
  start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
  const last = new Date(first);
  last.setUTCMonth(first.getUTCMonth() + 1, 0);
  const count = Math.ceil(((first.getUTCDay() + 6) % 7 + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return consultationDay(day);
  });
}
