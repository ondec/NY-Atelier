export const orderSources = [
  {value: 'customer_app', label: 'Customer app'},
  {value: 'studio', label: 'Studio'},
  {value: 'office', label: 'Office'},
] as const;
export type OrderSource = (typeof orderSources)[number]['value'];
export const orderSourceLabel = (source: string | null | undefined) => orderSources.find(item => item.value === source)?.label ?? 'Not recorded';
