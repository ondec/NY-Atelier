import type { DemoOrder } from './orders';
import { isCancelledStatus } from './status';
import {orderSourceLabel, type OrderSource} from './order-source';

export const orderTypes = [
  { value: 'Ready-to-Wear', label: 'Ready-to-Wear' },
  { value: 'Custom', label: 'Bespoke / Custom' },
  { value: 'Alterations', label: 'Alterations' },
] as const;
export const parseOrderType = (value: unknown): DemoOrder['category'] | '' => orderTypes.find(type => type.value === value)?.value ?? '';
export const orderStage = (order: DemoOrder) => order.is_complete && !isCancelledStatus(order.status) ? 'Completed' : order.status;
export type DeskFilters = { category: DemoOrder['category'] | ''; status: string; query: string; stage: string; fulfilment: string; source?: OrderSource | 'unrecorded' | '' };
export function filterOrderDesk(orders: DemoOrder[], filters: DeskFilters) {
  const query = filters.query.trim().toLowerCase();
  return orders.filter(order => {
    const cancelled = isCancelledStatus(order.status);
    return (!filters.category || order.category === filters.category) &&
      (filters.status === 'all' || (filters.status === 'cancelled' ? cancelled : filters.status === 'completed' ? order.is_complete && !cancelled : !order.is_complete && !cancelled)) &&
      (!filters.stage || orderStage(order) === filters.stage) &&
      (!filters.fulfilment || order.fulfilment_method === filters.fulfilment) &&
      (!filters.source || (filters.source === 'unrecorded' ? orderSourceLabel(order.source) === 'Not recorded' : order.source === filters.source)) &&
      [order.reference, order.customer_name, order.category, order.service_offering ?? '', orderSourceLabel(order.source), ...order.items.map(item => item.garment_name)].some(value => value.toLowerCase().includes(query));
  });
}
