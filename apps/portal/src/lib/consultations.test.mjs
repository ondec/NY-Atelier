import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDays, consultationGanttRows, consultationSlots, filterConsultations, shiftConsultationMonth } from './consultations.ts';

const defaults = { search: '', status: '', method: '', service: '', from: '', to: '' };
const request = {
  id: 'request', customer_id: 1, customer_name: 'Ama Mensah', customer_email: 'ama@example.test', customer_phone: null,
  method: 'virtual', purpose: 'Couture Experience', notes: 'Review silk options', status: 'awaiting-confirmation',
  preferredDate: '2026-11-20', preferredTime: '10:00', confirmedDate: null, confirmedTime: null, options: [], version: 1,
};

test('search combines customer details and notes with status, service and meeting filters', () => {
  const other = { ...request, id: 'other', method: 'in-person', status: 'confirmed' };
  assert.deepEqual(filterConsultations([request, other], { ...defaults, search: ' AMA@EXAMPLE ', method: 'virtual', status: 'awaiting-confirmation', service: 'Couture Experience' }).map(row => row.id), ['request']);
  assert.equal(filterConsultations([request], { ...defaults, search: 'silk' }).length, 1);
  assert.equal(filterConsultations([request], { ...defaults, search: 'trousers' }).length, 0);
});

test('confirmed date replaces the original request in both calendar and date filters', () => {
  const row = { ...request, status: 'confirmed', confirmedDate: '2026-11-24', confirmedTime: '14:00' };
  assert.deepEqual(consultationSlots(row), [{ date: '2026-11-24', time: '14:00', label: 'Confirmed' }]);
  assert.equal(filterConsultations([row], { ...defaults, from: '2026-11-20', to: '2026-11-20' }).length, 0);
  assert.equal(filterConsultations([row], { ...defaults, from: '2026-11-24', to: '2026-11-24' }).length, 1);
});

test('suggestions stay provisional and any suggested slot can match the date range', () => {
  const row = { ...request, status: 'awaiting-customer', options: [{ date: '2026-11-22', time: '12:00' }, { date: '2026-11-25', time: '15:00' }] };
  assert.equal(consultationSlots(row)[1].label, 'Suggested');
  assert.equal(filterConsultations([row], { ...defaults, from: '2026-11-25', to: '2026-11-25' }).length, 1);
  assert.equal(filterConsultations([row], { ...defaults, from: '2026-11-26', to: '2026-11-24' }).length, 0);
});

test('calendar weeks start Monday and cover month boundaries and leap days', () => {
  const november = calendarDays('2026-11');
  assert.equal(november[0], '2026-10-26');
  assert.equal(november.at(-1), '2026-12-06');
  assert.equal(november.length, 42);
  assert.ok(calendarDays('2028-02').includes('2028-02-29'));
  assert.equal(calendarDays('2027-02').length, 28);
});

test('calendar navigation crosses years in both directions', () => {
  assert.equal(shiftConsultationMonth('2026-12', 1), '2027-01');
  assert.equal(shiftConsultationMonth('2026-01', -1), '2025-12');
  assert.equal(shiftConsultationMonth('2028-02', 12), '2029-02');
});

test('Gantt spans use actual request timestamps and agreed appointments', () => {
  const row = { ...request, created_at: '2026-11-17T09:00:00Z', status: 'confirmed', confirmedDate: '2026-11-24', confirmedTime: '14:00' };
  const [result] = consultationGanttRows([row]);
  assert.equal(result.receivedAt, '2026-11-17T09:00:00.000Z');
  assert.equal(result.end, '2026-11-24T14:00:00Z');
  assert.equal(result.appointments[0].label, 'Confirmed');
});

test('Gantt retains only proposed slots within filters and never invents a start date', () => {
  const row = { ...request, status: 'awaiting-customer', options: [{ date: '2026-11-22', time: '12:00' }, { date: '2026-11-25', time: '15:00' }] };
  const [result] = consultationGanttRows([row], '2026-11-25', '2026-11-25');
  assert.equal(result.receivedAt, null);
  assert.equal(result.appointments.length, 1);
  assert.equal(result.appointments[0].at, '2026-11-25T15:00:00Z');
  assert.equal(consultationGanttRows([{ ...request, created_at: 'invalid' }])[0].receivedAt, null);
  assert.equal(consultationGanttRows([{ ...request, created_at: '2026-11-30T10:00:00Z' }])[0].receivedAt, null);
  assert.deepEqual(consultationGanttRows([row], '2026-12-01'), []);
});
