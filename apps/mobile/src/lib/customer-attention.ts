import { useDemoCustomer } from './demo-customer';
import { useOrderUpdates } from './order-updates';

export function useCustomerAttention() {
  const { requests } = useDemoCustomer();
  const { orders, unread } = useOrderUpdates();
  const consultations = requests.filter(request => request.status === 'awaiting-customer');
  const actionOrders = orders.filter(order => !order.is_complete && Boolean(order.client_action));
  const actionCount = consultations.length + actionOrders.length;
  return { consultations, actionOrders, actionCount, unread, badgeCount: actionCount + unread };
}
