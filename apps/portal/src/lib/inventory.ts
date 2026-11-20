import { demoStock } from "../../../mobile/src/data/demo-stock";
import { shopCatalogue } from "./shop-catalogue";

export const productTypes = ["Tops & shirts", "Trousers", "Two-piece sets", "Kaftans", "Agbadas", "Suits", "Dresses", "Skirts", "Other"] as const;
export type ProductType = (typeof productTypes)[number];
export type Product = { id: string; name: string; type: ProductType; price: number; createdAt?: string; catalogueId?: string; photo?: string; gallery?: string[]; colours?: readonly string[] };
export type Variant = { id: string; productId: string; colour: string; fabric?: string; size: string; sku: string; location?: string; quantity: number; reorderAt: number };
export type Movement = { id: string; variantId: string; change: number; reason: string; note: string; occurredAt: string };
export type VariantVisual = { swatch?: string; photo?: string; gallery?: string[] };
export type Inventory = { visuals?: Record<string, VariantVisual>; products: Product[]; variants: Variant[]; movements: Movement[] };
export const storageKey = "ny-atelier-rtw-inventory-draft-v1";

export const variantLabel = (row: Variant) => [row.colour, row.fabric].filter(Boolean).join(" · ");
export const normalize = (value: string) => value.trim().toLowerCase();
export const variantKey = (row: Pick<Variant, "productId" | "colour" | "fabric">) => JSON.stringify([row.productId, normalize(row.colour), normalize(row.fabric ?? "")]);
function withDemoStock(products: Product[], saved: Variant[]): Variant[] {
  const occupied = new Set(saved.map((row) => JSON.stringify([variantKey(row), normalize(row.size)])));
  const skus = new Set(saved.map((row) => normalize(row.sku)));
  const sampleRows = shopCatalogue.flatMap((item) => {
    const product = products.find((row) => row.id === item.id || row.catalogueId === item.id);
    const code = item.id.slice(5);
    return (demoStock[code] ?? []).flatMap((variant) => Object.entries(variant.stock).map(([size, quantity]) => ({
      id: `demo-${code}-${variant.id}-${size}`,
      productId: product?.id ?? item.id,
      colour: variant.colour,
      fabric: variant.fabric,
      size,
      sku: `DEMO-${code}-${variant.id}-${size}`.toUpperCase(),
      quantity,
      reorderAt: 2,
    })));
  });
  return [...saved, ...sampleRows.filter((row) =>
    !occupied.has(JSON.stringify([variantKey(row), normalize(row.size)])) && !skus.has(normalize(row.sku))
  )];
}

function withRedCloverGalleries(products: Product[], saved: Inventory["visuals"] = {}) {
  const product = products.find((item) => (item.catalogueId ?? item.id) === "shop-redclover-navy");
  if (!product) return saved;

  const visuals = { ...saved };
  for (const edition of demoStock["redclover-navy"]) {
    const key = variantKey({ productId: product.id, colour: edition.colour, fabric: edition.fabric });
    const campaign = edition.id === "navy"
      ? Array.from({ length: 4 }, (_, index) => `/collections/royal-blue-stripes-${index + 1}.jpg`)
      : ["front", "side", "field", "detail"].map((pose) => `/collections/red-clover-${edition.id}-campaign-${pose}.png`);
    const gallery = [`/collections/red-clover-${edition.id}-front.png`, ...campaign];
    visuals[key] = { gallery, ...saved[key] };
  }
  return visuals;
}

export const emptyInventory: Inventory = {
  products: [...shopCatalogue], visuals: withRedCloverGalleries([...shopCatalogue]), variants: withDemoStock([...shopCatalogue], []), movements: [],
};
export function parseInventory(value: string | null): Inventory {
  if (!value) return emptyInventory;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return emptyInventory;
    const record = parsed as Partial<Inventory>;
    const savedProducts = Array.isArray(record.products) ? record.products : [];
    const matchedIds = new Set<string>();
    const catalogue = shopCatalogue.map((item) => {
      const match = savedProducts.find((product) => product.id === item.id || product.catalogueId === item.id)
        ?? savedProducts.find((product) => product.name.trim().toLowerCase() === item.name.toLowerCase());
      if (match) matchedIds.add(match.id);
      const name = match?.name === "Redclover Set — Navy Blue Edition" && item.id === "shop-redclover-navy"
        ? item.name : match?.name ?? item.name;
      return { ...item, ...match, name, catalogueId: item.id };
    });
    const products = [...catalogue, ...savedProducts.filter((product) => !matchedIds.has(product.id))];
    return {
      products,
      visuals: withRedCloverGalleries(products, record.visuals),
      variants: withDemoStock(products, Array.isArray(record.variants) ? record.variants : []),
      movements: Array.isArray(record.movements) ? record.movements : [],
    };
  } catch { return emptyInventory; }
}

export const inventoryChanged = "ny-atelier-inventory-changed";
export const isLowStock = (row: Variant) => row.quantity > 0 && row.quantity <= row.reorderAt;
