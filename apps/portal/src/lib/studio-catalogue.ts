import type { Inventory } from './inventory';

export type StudioFilters = { query: string; clothingType: string; size: string; availability: string };
export function filterStudioCatalogue(inventory: Inventory, productIds: readonly string[] | undefined, filters: StudioFilters) {
  const needle = filters.query.trim().toLowerCase();
  return inventory.products.filter(product => {
    if (productIds && !productIds.includes(product.id)) return false;
    if (filters.clothingType !== 'all' && product.type !== filters.clothingType) return false;
    const variants = inventory.variants.filter(row => row.productId === product.id);
    if (![product.name, product.type, ...variants.flatMap(row => [row.sku, row.colour, row.fabric ?? ''])].some(value => value.toLowerCase().includes(needle))) return false;
    const stock = variants.filter(row => filters.size === 'all' || row.size === filters.size);
    const counted = stock.filter(row => row.stockVerified !== false);
    if (filters.size !== 'all' && !stock.length) return false;
    if (filters.availability === 'not-counted') return stock.some(row => row.stockVerified === false) || (!variants.length && Boolean(product.wordpressId));
    if (filters.availability === 'in-stock') return counted.some(row => row.quantity > 0);
    if (filters.availability === 'low-stock') return counted.some(row => row.quantity > 0 && row.quantity <= row.reorderAt);
    if (filters.availability === 'out-of-stock') return counted.length > 0 && counted.every(row => row.quantity === 0) && counted.length === stock.length;
    return true;
  });
}
