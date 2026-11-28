export function readStudioLocation(search: string) {
  const query = new URLSearchParams(search);
  const workspaceModule = query.get('view') === 'fittings' ? 'measurements' : query.get('view') === 'collection' ? 'collection' : query.get('view') === 'orders' ? 'orders' : 'welcome';
  const rawId = query.get('customer');
  const parsedId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const customerId = parsedId && Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : undefined;
  const screen = query.get('screen');
  const editor = screen === 'new-customer' ? 'customer' : screen === 'fitting' && workspaceModule === 'measurements' && customerId ? 'fitting' : undefined;
  const garment = query.get('garment');
  const templateId = garment && ['kaftan', 'agbada', 'suit', 'shirt-long', 'shirt-short', 'trousers-fitted'].includes(garment) ? garment : undefined;
  const saleDesk = screen === 'sale' && workspaceModule === 'collection';
  const product = query.get('product');
  const productId = workspaceModule === 'collection' && product && /^[a-zA-Z0-9][\w-]{0,149}$/.test(product) ? product : undefined;
  return {module: workspaceModule, customerId, editor, templateId, saleDesk, productId} as const;
}
export type StudioLocation = ReturnType<typeof readStudioLocation>;

export function openSavedCustomerFitting(host: Pick<Window, 'location' | 'history'>, customerId: number, templateId: string) {
  const url = new URL(host.location.href);
  url.searchParams.set('view', 'fittings');
  url.searchParams.set('customer', String(customerId));
  url.searchParams.delete('screen');
  url.searchParams.delete('product');
  url.searchParams.delete('garment');
  // Replace the completed customer form so Back never offers to create it again.
  host.history.replaceState({studioFittingProfile: true}, '', url);
  url.searchParams.set('screen', 'fitting');
  url.searchParams.set('garment', templateId);
  host.history.pushState({studioForm: true}, '', url);
}
