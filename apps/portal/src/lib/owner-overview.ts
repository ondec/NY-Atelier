import type {DemoOrder} from './orders';
import type {StaffConsultation} from './consultations';

export type OverviewPeriod = 'month' | '30days' | 'year';
export type OwnerFinances = {
  period: OverviewPeriod; from: string; to: string; previous_from: string; previous_to: string;
  sales_minor: number; sales_count: number; previous_sales_minor: number; previous_sales_count: number;
  average_sale_minor: number | null; series: {date: string; total_minor: number}[];
  payroll_paid_minor: number; payroll_outstanding_minor: number; salary_approvals: number; scope: string; updated_at: string;
};
export type OwnerOverviewData = {orders: DemoOrder[] | null; consultations: StaffConsultation[] | null; finances: OwnerFinances | null; updatedAt: string};
