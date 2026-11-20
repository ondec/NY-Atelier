export function shopColumns(width: number, fontScale = 1): number {
  if (width < 340 || fontScale >= 1.8) return 1;
  return Math.max(2, Math.min(4, Math.floor((width - 28) / (230 * Math.max(1, fontScale)))));
}

export const customerTabs = ['/', '/shop', '/atelier', '/orders', '/account'] as const;
export function swipeTab(path: string, dx: number, dy: number): typeof customerTabs[number] | undefined {
  const index = customerTabs.findIndex(tab => tab === path);
  if (index < 0 || Math.abs(dx) < 72 || Math.abs(dx) <= Math.abs(dy) * 2) return;
  return customerTabs[index + (dx < 0 ? 1 : -1)];
}
