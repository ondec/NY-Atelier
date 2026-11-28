import type {DemoOrder} from './orders';
import type {StaffConsultation} from './consultations';

export type OverviewPeriod = 'month' | '30days' | 'year';
export type OwnerFinances = {
  period: OverviewPeriod; from: string; to: string; previous_from: string; previous_to: string;
  sales_minor: number; sales_count: number; previous_sales_minor: number; previous_sales_count: number;
  average_sale_minor: number | null; series: {date: string; total_minor: number}[];
  payroll_paid_minor: number; payroll_outstanding_minor: number; salary_approvals: number; scope: string; updated_at: string;
};
/** A delivery as the office sees it (from the delivery board). */
export type OverviewDelivery = {reference: string; stage: string; ready: boolean; due_from: string | null; due_by: string | null; delivered_at: string | null; zone: string | null; area: string | null; courier: {id: number; name: string} | null; customer: {name: string}};
/** An order on the production floor. */
export type OverviewProduction = {reference: string; category: string; customer_name: string; status: string; expected_completion_date: string | null; is_complete: boolean; assigned_tailor: {id: number; name: string} | null};
export type OwnerOverviewData = {orders: DemoOrder[] | null; consultations: StaffConsultation[] | null; deliveries: OverviewDelivery[] | null; production: OverviewProduction[] | null; finances: OwnerFinances | null; updatedAt: string};
