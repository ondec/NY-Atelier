import type { Product, Variant } from './inventory';
// Product and sale selection describe the garment, never its agreed adjustment.
export function alterationContext(product: Pick<Product, 'name'>, variant?: Pick<Variant, 'colour'|'fabric'|'size'|'sku'>) {
  const edition = variant ? [variant.colour, variant.fabric].filter(Boolean).join(' · ') : '';
  return {
    garments: [[product.name, edition, variant?.size ? `Size ${variant.size}` : ''].filter(Boolean).join(' · ').slice(0,150)],
    notes: [product.name, edition, variant?.size ? `Size ${variant.size}` : '', variant?.sku ? `SKU ${variant.sku}` : ''].filter(Boolean).join(' · '),
  };
}
