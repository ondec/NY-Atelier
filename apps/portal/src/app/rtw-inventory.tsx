"use client";

import StatusBadge from "./status-badge";
import type { StatusTone } from "@/lib/status";

import { demoStock } from "../../../mobile/src/data/demo-stock";
import Image from "next/image";
import Link from "next/link";
import { daysFromToday, newArrivalDays, emptyInventory, inventoryChanged, isLowStock, stockKnown, normalize, parseInventory, productSections, productTypes, colourGroups, storageKey, variantKey, variantLabel, type Inventory, type Movement, type Product, type ProductSection, type ColourGroup, type Variant, type VariantVisual } from "@/lib/inventory";
import SizeChartEditor from "./size-chart-editor";
import { productSizing } from "../../../mobile/src/data/product-sizing";
import { sizingProductId } from "../../../mobile/src/lib/sizing";
import { shopCatalogue } from "@/lib/shop-catalogue";
import { Fragment, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Minus, PackagePlus, Plus, Search, X } from "@/components/icons";

import { GalleryFields, InventoryDrawer, preparePhoto, readGallery } from "./catalogue-editor";
import CatalogueImport from "./catalogue-import";

export type InventoryView = "overview" | "products" | "activity";
type FormMode = "edit-gallery" | "edit-product" | "product" | "variant" | "movement" | "restock" | null;

const sizeOptions = [
  { value: "S", label: "Small (S)" },
  { value: "M", label: "Medium (M)" },
  { value: "L", label: "Large (L)" },
  { value: "XL", label: "Extra Large (XL)" },
  { value: "2XL", label: "2XL" },
  { value: "3XL", label: "3XL" },
];
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);
const time = (value: string) => new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Accra" }).format(new Date(value));

function ProductGallery({ photos, label }: { photos: string[]; label: string }) {
  const [active, setActive] = useState(0);
  const index = Math.min(active, photos.length - 1);
  if (!photos.length) return null;
  return <div className="inventory-gallery" role="group" aria-label={label}>
    <Image className="inventory-gallery-main" src={photos[index]} alt={`${label}, photo ${index + 1}`} width={220} height={265} unoptimized />
    {photos.length > 1 && <div className="inventory-gallery-thumbnails">
      {photos.map((photo, position) => <button key={position} type="button" aria-label={`View photo ${position + 1}`} aria-pressed={index === position} onClick={() => setActive(position)}>
        <Image src={photo} alt="" width={52} height={62} unoptimized />
      </button>)}
    </div>}
  </div>;
}

const catalogueHref = "/ready-to-wear?view=products";
const distinctLabels = (labels: readonly string[]) => [...new Map(labels.filter(Boolean).map((label) => [normalize(label), label])).values()];

function ColourDetails({ visual }: { visual?: VariantVisual }) {
  const [mode, setMode] = useState<"colour" | "none">(visual?.swatch ? "colour" : "none");
  const [swatch, setSwatch] = useState(visual?.swatch ?? "#123c45");
  return <div className="inventory-form-grid">
    <label>Customer swatch<select name="swatchMode" value={mode} onChange={(event) => setMode(event.target.value === "colour" ? "colour" : "none")}>
      <option value="none">{visual?.photo ? "Use the fabric photo" : "No swatch"}</option>
      <option value="colour">Solid colour</option>
    </select></label>
    {mode === "colour" && <label>Swatch colour<span className="inventory-swatch-picker"><input type="color" name="swatch" value={swatch} onChange={(event) => setSwatch(event.target.value)} /><span>{swatch.toUpperCase()}</span></span></label>}
    <label>Colour group<select name="group" defaultValue={visual?.group ?? ""}>
      <option value="">Not set</option>
      {colourGroups.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
  </div>;
}

function VariantAppearance() {
  const [mode, setMode] = useState<"colour" | "photo">("colour");
  const [swatch, setSwatch] = useState("#123c45");
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  return <fieldset className="inventory-size-entries">
    <legend>Customer swatch</legend>
    <p>Choose how this variant will appear in the shop’s colour selector.</p>
    <div className="inventory-swatch-options">
      <label><input type="radio" name="swatchType" value="colour" checked={mode === "colour"} onChange={() => {
        setMode("colour");
        setPreview(undefined);
      }} /> Solid colour</label>
      <label><input type="radio" name="swatchType" value="photo" checked={mode === "photo"} onChange={() => setMode("photo")} /> Fabric photo</label>
    </div>
    <div className="inventory-form-grid inventory-appearance-fields">
      {mode === "colour" ? <label key="solid-colour">Swatch colour<input type="color" name="swatch" value={swatch} onChange={(event) => setSwatch(event.target.value)} /></label>
        : <label key="fabric-photo">Fabric photo<input type="file" name="fabricPhoto" accept="image/jpeg,image/png,image/webp" required onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : undefined);
        }} /></label>}
      <div className="inventory-customer-swatch">
        <span>Swatch preview</span>
        {mode === "colour" ? <span className="inventory-customer-swatch-sample" style={{ background: swatch }} />
          : preview ? <Image className="inventory-customer-swatch-sample" src={preview} alt="Fabric swatch preview" width={42} height={42} unoptimized />
            : <span>Choose a photo to preview it.</span>}
      </div>
    </div>
  </fieldset>;
}

export default function ReadyToWearInventory({ view, productId, canImport = false }: { view: InventoryView; productId?: string; canImport?: boolean }) {
  const [inventory, setInventory] = useState<Inventory>(emptyInventory);
  const [loaded, setLoaded] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [savingVariant, setSavingVariant] = useState(false);
  const [sizeVariant, setSizeVariant] = useState<Variant>();
  const [restockRow, setRestockRow] = useState<Variant>();
  const [selectedProduct, setSelectedProduct] = useState<string>();
  const [sizeRows, setSizeRows] = useState([0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<StatusTone>("info");
  function showMessage(text: string, tone: StatusTone = "warning") {
    setMessageTone(tone);
    setMessage(text);
  }

  useEffect(() => {
    const refresh = () => { setInventory(parseInventory(localStorage.getItem(storageKey))); setLoaded(true); };
    queueMicrotask(refresh);
    window.addEventListener(inventoryChanged, refresh);
    return () => window.removeEventListener(inventoryChanged, refresh);
  }, []);

  useEffect(() => {
    if (!message || formMode) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message, formMode]);

  function save(next: Inventory) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    setInventory(next);
    window.dispatchEvent(new Event(inventoryChanged));
  }

  function field(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }

  function openVariantForm(productId?: string, variant?: Variant) {
    setSelectedProduct(productId);
    setSizeVariant(variant);
    setSizeRows([0]);
    setFormMode("variant");
    showMessage("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingVariant) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const editing = formMode === "edit-product";
    if (editing && !selected) return;
    const name = field(data, "name");
    const price = Number(field(data, "price"));
    const type = productTypes.find((option) => option === field(data, "type"));
    if (!name || !type || !Number.isFinite(price) || price < 0) {
      showMessage("Enter a product name, clothing type and valid price.");
      return;
    }
    const description = field(data, "description").slice(0, 20000);
    const section = productSections.find((option) => option.value === field(data, "section"))?.value as ProductSection | undefined;
    const offerText = field(data, "offerPrice");
    const offerPrice = offerText ? Number(offerText) : undefined;
    if (offerPrice !== undefined && (!Number.isFinite(offerPrice) || offerPrice <= 0 || offerPrice >= price)) {
      showMessage("The offer price must be more than 0 and lower than the regular price.");
      return;
    }
    const isNew = data.get("isNew") === "on";
    const newUntil = isNew ? field(data, "newUntil") || daysFromToday(newArrivalDays) : undefined;
    if (newUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(newUntil) || newUntil < daysFromToday(0))) {
      showMessage("Choose a “New until” date from today onwards.");
      return;
    }
    const details = { description: description || undefined, section, offerPrice, isNew: isNew || undefined, newUntil };
    if (inventory.products.some((product) => (!editing || product.id !== selected?.id) && normalize(product.name) === normalize(name))) {
      showMessage("That product name is already in use.");
      return;
    }

    setSavingVariant(true);
    try {
      const gallery = await readGallery(data, editing && selected ? selected.gallery ?? (selected.photo ? [selected.photo] : []) : []);
      if (!form.isConnected) return;
      const photo = gallery[0] ?? "";
      if (editing && selected) {
        const product = { ...selected, name, type, price, photo, gallery, ...details };
        save({ ...inventory, products: inventory.products.map((item) => item.id === product.id ? product : item) });
        setFormMode(null);
        showMessage(`${name} updated.`, "success");
        return;
      }
      const product: Product = { id: crypto.randomUUID(), name, type, price, photo, gallery, ...details, createdAt: new Date().toISOString() };
      save({ ...inventory, products: [...inventory.products, product] });
      openVariantForm(product.id);
      showMessage(`${name} added. You can now add its first variant.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save the product in this browser.", "danger");
    } finally {
      setSavingVariant(false);
    }
  }

  async function saveVariantGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sizeVariant || savingVariant) return;
    const form = event.currentTarget;
    const key = variantKey(sizeVariant);
    const visual = inventory.visuals?.[key];
    setSavingVariant(true);
    try {
      const data = new FormData(form);
      const gallery = await readGallery(data, visual?.gallery ?? []);
      if (!form.isConnected) return;
      const picked = field(data, "swatch");
      const swatch = data.get("swatchMode") === "colour" && /^#[0-9a-f]{6}$/i.test(picked) ? picked : undefined;
      const group = colourGroups.find((option) => option.value === field(data, "group"))?.value as ColourGroup | undefined;
      const next: VariantVisual = { ...visual, gallery, swatch, group };
      if (!swatch) delete next.swatch;
      if (!group) delete next.group;
      save({ ...inventory, visuals: { ...inventory.visuals, [key]: next } });
      setFormMode(null);
      showMessage(`${variantLabel(sizeVariant)} updated.`, "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not save the gallery in this browser.", "danger");
    } finally {
      setSavingVariant(false);
    }
  }

  async function addVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (savingVariant) return;
    const productId = selected?.id ?? field(data, "productId");
    const colour = sizeVariant?.colour ?? field(data, "colour");
    const fabric = sizeVariant ? sizeVariant.fabric ?? "" : field(data, "fabric");
    if (!colour && !fabric) { showMessage("Enter a colour or fabric for this variant."); return; }
    if (!inventory.products.some((product) => product.id === productId)) return;

    const rows: Variant[] = sizeRows.map((row) => ({
      id: crypto.randomUUID(), productId, colour, fabric,
      size: field(data, `size-${row}`).toUpperCase(),
      sku: field(data, `sku-${row}`).toUpperCase(),
      quantity: Number(field(data, `quantity-${row}`)),
      reorderAt: Number(field(data, `reorderAt-${row}`)),
    }));
    const knownSkus = new Set(inventory.variants.map((row) => normalize(row.sku)));
    const stockKey = (row: Variant) => JSON.stringify([variantKey(row), normalize(row.size)]);
    const knownSizes = new Set(inventory.variants.map(stockKey));
    for (const row of rows) {
      if (!row.size || !row.sku || !Number.isSafeInteger(row.quantity) || row.quantity < 0 || !Number.isSafeInteger(row.reorderAt) || row.reorderAt < 0) {
        showMessage("Enter a size, SKU and valid quantities for each row.");
        return;
      }
      if (knownSkus.has(normalize(row.sku))) { showMessage(`SKU ${row.sku} is already in use.`); return; }
      if (knownSizes.has(stockKey(row))) { showMessage(`Size ${row.size} already exists for this variant. Use a stock movement to update its quantity.`); return; }
      knownSkus.add(normalize(row.sku));
      knownSizes.add(stockKey(row));
    }
    const occurredAt = new Date().toISOString();
    const movements = rows.filter((row) => stockKnown(row) && row.quantity > 0).map((row) => ({
      id: crypto.randomUUID(), variantId: row.id, change: row.quantity,
      reason: "Opening stock", note: "Initial counted quantity", occurredAt,
    }));
    const key = variantKey(rows[0]);
    const pickedColour = field(data, "swatch");
    const swatchType = field(data, "swatchType");
    const swatch = swatchType === "colour" && /^#[0-9a-f]{6}$/i.test(pickedColour) ? pickedColour : undefined;
    const file = data.get("fabricPhoto");
    const hasPhoto = swatchType === "photo" && file instanceof File && file.size > 0;
    if (!sizeVariant && !swatch && !hasPhoto) {
      showMessage("Choose a swatch colour or upload a fabric photo.");
      return;
    }
    const visual: VariantVisual = {};
    setSavingVariant(true);
    try {
      if (swatch) visual.swatch = swatch;
      if (hasPhoto) visual.photo = await preparePhoto(file, 240);
      if (!sizeVariant) visual.gallery = await readGallery(data, inventory.visuals?.[key]?.gallery ?? []);
      if (!form.isConnected) return;
      save({
        ...inventory,
        visuals: swatch || hasPhoto ? { ...inventory.visuals, [key]: visual } : inventory.visuals,
        variants: [...inventory.variants, ...rows],
        movements: [...movements, ...inventory.movements],
      });
    } catch (error) {
      showMessage(error instanceof DOMException && error.name === "QuotaExceededError"
        ? "This browser is out of storage. Try saving without a photo."
        : hasPhoto ? "Could not save the fabric photo. Choose a valid JPG, PNG or WebP image up to 15 MB." : "Could not save the variant in this browser.", "danger");
      return;
    } finally {
      setSavingVariant(false);
    }
    setFormMode(null);
    showMessage(`Saved ${variantLabel(rows[0])} with ${rows.length} size entries.`, "success");
  }

  function adjustStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const restocking = formMode === "restock";
    const variantId = restocking ? restockRow?.id : field(data, "variantId");
    const direction = restocking ? "in" : field(data, "direction");
    const quantity = Number(field(data, "quantity"));
    const variant = (restocking ? inventory.variants : movementRows).find((item) => item.id === variantId);
    if (!variant || !Number.isSafeInteger(quantity) || quantity <= 0) return;
    const change = direction === "in" ? quantity : -quantity;
    if (variant.quantity + change < 0) { showMessage(`Cannot remove ${quantity}. ${variant.sku} has only ${variant.quantity} on hand.`); return; }
    if (!Number.isSafeInteger(variant.quantity + change)) { showMessage("Enter a smaller quantity."); return; }
    const reason = restocking ? "Received" : field(data, "reason");
    const movement: Movement = { id: crypto.randomUUID(), variantId: variant.id, change, reason, note: field(data, "note"), occurredAt: new Date().toISOString() };
    save({ ...inventory, variants: inventory.variants.map((item) => item.id === variantId ? { ...item, quantity: item.quantity + change, stockVerified: true } : item), movements: [movement, ...inventory.movements] });
    setFormMode(null); showMessage(`${variant.sku} updated by ${change > 0 ? "+" : ""}${change}.`, "success");
  }

  const totalOnHand = inventory.variants.reduce((sum, variant) => sum + variant.quantity, 0);
  const lowStock = inventory.variants.filter(isLowStock);
  const outOfStock = inventory.variants.filter((variant) => stockKnown(variant) && variant.quantity === 0);
  const productName = (id: string) => inventory.products.find((product) => product.id === id)?.name ?? "Archived product";
  const variantName = (id: string) => {
    const variant = inventory.variants.find((item) => item.id === id);
    return variant ? `${productName(variant.productId)} · ${variantLabel(variant)} / ${variant.size}` : "Archived variant";
  };
  const detailView = view === "products" && Boolean(productId);
  const selected = detailView ? inventory.products.find((product) => product.id === productId) : undefined;
  const catalogueProduct = selected && shopCatalogue.find((product) => product.id === (selected.catalogueId ?? selected.id));
  const productSwatches = catalogueProduct ? demoStock[catalogueProduct.id.slice(5)] ?? [] : [];
  const detailColours = selected
    ? distinctLabels([...(selected.colours ?? []), ...inventory.variants.filter((row) => row.productId === selected.id).map((row) => row.colour)])
    : [];
  const stockRows = detailView ? inventory.variants.filter((row) => row.productId === selected?.id) : inventory.variants;
  const variantGroups = new Map<string, Variant[]>();
  if (detailView) {
    for (const row of stockRows) {
      const key = variantKey(row);
      const group = variantGroups.get(key);
      if (group) group.push(row);
      else variantGroups.set(key, [row]);
    }
  }
  const search = normalize(query);
  const rowsByProduct = new Map<string, Variant[]>();
  for (const row of stockRows) {
    const rows = rowsByProduct.get(row.productId);
    if (rows) rows.push(row);
    else rowsByProduct.set(row.productId, [row]);
  }
  const productMatches = (product: Product) =>
    [product.name, ...(product.colours ?? [])].some((value) => normalize(value).includes(search));
  const visibleVariants = stockRows.filter((variant) => {
    const product = inventory.products.find((item) => item.id === variant.productId);
    const matchesSearch = !search || (product && productMatches(product)) ||
      [variant.sku, variant.colour, variant.fabric ?? ""].some((value) => normalize(value).includes(search));
    const matchesStock = filter === "all" || (filter === "uncounted" ? !stockKnown(variant) : filter === "low" ? isLowStock(variant) : stockKnown(variant) && variant.quantity === 0);
    return matchesSearch && matchesStock;
  });
  const matchingProductIds = new Set(visibleVariants.map((row) => row.productId));
  const visibleProducts = inventory.products.filter((product) =>
    matchingProductIds.has(product.id) || (filter === "all" && productMatches(product))
  );
  const movementRows = view === "products" ? visibleVariants : stockRows;

  const title = detailView ? selected?.name ?? "Product details" : view === "overview" ? "Garment inventory." : view === "products" ? "Products & variants." : "Stock activity.";
  const intro = detailView ? selected && `${selected.type} · ${money(selected.price)}` : view === "overview" ? "The stock behind the ready-to-wear shop, kept apart from Atelier materials and customer garments." : view === "products" ? "Sample stock by colour, fabric and size." : "A record of every quantity change made in this browser.";

  const formHelp = {
    product: "Create a garment with a name, clothing type and price. You can add its first colour or fabric variant after saving.",
    "edit-gallery": "Set the swatch customers tap, the colour group used by the shop filters, and the photos for this colour or fabric.",
    "edit-product": "Update the garment's name, type, price, shop section, offer, description and photos. Choose New arrival to show it in New arrivals on the store and app.",
    variant: sizeVariant
      ? "Add sizes and opening quantities to this colour or fabric."
      : "Create a colour or fabric option for this garment, then enter its sizes, SKUs and opening quantities.",
    restock: "Enter the units received for this size. Saving increases its stock count and adds an entry to Stock activity.",
    movement: "Choose a colour and size by SKU. Use Stock in for received or returned units, or Stock out for sold or damaged units. Choose a reason and add a note. Saving updates the quantity on hand and logs the change in Stock activity.",
  };

  const formPanel = formMode && <section className="panel inventory-form-panel"><div className="inventory-form-title"><div><h2>{formMode === "edit-gallery" ? `Edit ${sizeVariant ? variantLabel(sizeVariant) : "colour"}` : formMode === "edit-product" ? "Edit product details" : formMode === "product" ? "Add a ready-to-wear product" : formMode === "variant" ? sizeVariant ? `Add size · ${variantLabel(sizeVariant)}` : "Add a colour or fabric variant" : formMode === "restock" ? "Add stock" : "Record a stock movement"}</h2></div><button type="button" aria-label="Close form" title="Close form" onClick={() => setFormMode(null)}><X size={18} /></button></div>
      <p className="portal-form-help">{formHelp[formMode]}</p>
      {message && <p className="inventory-message" data-tone={messageTone} role={messageTone === "success" ? "status" : "alert"}>{message}</p>}
      {(formMode === "product" || (formMode === "edit-product" && selected)) && <form key={formMode} onSubmit={saveProduct}>
        <div className="inventory-form-grid">
          <label>Product name<input name="name" defaultValue={formMode === "edit-product" ? selected?.name : undefined} placeholder="e.g. Amani Set" required /></label>
          <label>Clothing type<select name="type" defaultValue={formMode === "edit-product" ? selected?.type : undefined}>{productTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Price (GHS)<input name="price" type="number" min="0" step="0.01" defaultValue={formMode === "edit-product" ? selected?.price : undefined} required /></label>
          <label>Shop section<select name="section" defaultValue={formMode === "edit-product" ? selected?.section ?? "" : ""}>
            <option value="">Not set</option>
            {productSections.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select></label>
          <label>Offer price (GHS)<input name="offerPrice" type="number" min="0" step="0.01" placeholder="Leave empty for no offer" defaultValue={formMode === "edit-product" ? selected?.offerPrice : undefined} /></label>
        </div>
        <label className="inventory-description">Description<textarea name="description" rows={4} maxLength={20000} placeholder="Fabric, fit and care notes customers will see" defaultValue={formMode === "edit-product" ? selected?.description : undefined} /></label>
        <div className="inventory-product-options">
          <NewArrivalField key={selected?.id ?? "new"} isNew={formMode === "edit-product" && selected?.isNew === true} newUntil={formMode === "edit-product" ? selected?.newUntil : undefined} />
        </div>
        <GalleryFields label="Product photos" photos={formMode === "edit-product" && selected ? selected.gallery ?? (selected.photo ? [selected.photo] : []) : []} />
        <div className="inventory-form-footer"><button type="submit" disabled={savingVariant}>{savingVariant ? "Saving…" : formMode === "edit-product" ? "Save changes" : "Save product"}</button></div>
      </form>}
      {formMode === "edit-gallery" && sizeVariant && <form key={sizeVariant.id} onSubmit={saveVariantGallery}>
        <ColourDetails visual={inventory.visuals?.[variantKey(sizeVariant)]} />
        <GalleryFields label={`${variantLabel(sizeVariant)} photos`} photos={inventory.visuals?.[variantKey(sizeVariant)]?.gallery} />
        <div className="inventory-form-footer"><button type="submit" disabled={savingVariant}>{savingVariant ? "Saving…" : "Save colour"}</button></div>
      </form>}
      {formMode === "variant" && <form key={sizeVariant?.id ?? selectedProduct} onSubmit={addVariant}>
        <div className="inventory-form-grid">
          {!detailView && <label>Product<select name="productId" defaultValue={selectedProduct} required>{inventory.products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>}
          {!sizeVariant && <><label>Colour<input name="colour" placeholder="e.g. Cream" /></label>
          <label>Fabric<input name="fabric" placeholder="e.g. Rose print cotton" /></label></>}
        </div>
        {!sizeVariant && <><VariantAppearance /><GalleryFields label="Variant photos" /></>}
        <fieldset className="inventory-size-entries">
          <legend>Sizes and quantities</legend>
          {sizeRows.map((row, index) => <div className="inventory-size-row inventory-form-grid" key={row} role="group" aria-label={`Size entry ${index + 1}`}>
            <label>Size
              <select name={`size-${row}`} defaultValue="" required>
                <option value="" disabled>Select size</option>
                {sizeOptions.map(({ value, label }) => <option key={value} value={value} disabled={Boolean(sizeVariant && stockRows.some((row) => variantKey(row) === variantKey(sizeVariant) && normalize(row.size) === normalize(value)))}>{label}</option>)}
              </select>
            </label>
            <label>Unique SKU<input name={`sku-${row}`} placeholder="e.g. AMANI-CRM-M" required /></label>
            <label>Opening quantity<input name={`quantity-${row}`} type="number" min="0" step="1" required /></label>
            <label>Low-stock alert at<input name={`reorderAt-${row}`} type="number" min="0" step="1" defaultValue="2" required /></label>
            {sizeRows.length > 1 && <button type="button" className="inventory-quiet-button" onClick={() => setSizeRows(sizeRows.filter((id) => id !== row))}>Remove size</button>}
          </div>)}
          <button type="button" className="inventory-quiet-button" onClick={() => setSizeRows([...sizeRows, Math.max(...sizeRows) + 1])}><Plus size={16} /> Add another size</button>
        </fieldset>
        <div className="inventory-form-footer"><span>Enter the quantity counted for each size.</span><button type="submit" disabled={savingVariant}>{savingVariant ? "Saving…" : sizeVariant ? "Save sizes" : "Save variant"}</button></div>
      </form>}
      {formMode === "restock" && restockRow && <form key={restockRow.id} className="inventory-restock-form" onSubmit={adjustStock}>
        <p className="inventory-restock-context">{variantName(restockRow.id)} · {stockKnown(restockRow) ? `${restockRow.quantity} on hand` : "Not counted yet"}</p>
        <div className="inventory-form-grid inventory-restock-fields">
          <div className="inventory-restock-quantity">
            <label htmlFor="restock-quantity">Quantity to add</label>
            <div className="inventory-quantity-stepper">
              <button type="button" aria-label="Decrease quantity" title="Decrease quantity" onClick={(event) => {
                const input = event.currentTarget.form?.elements.namedItem("quantity");
                if (input instanceof HTMLInputElement && input.valueAsNumber > 1) input.stepDown();
              }}><Minus size={18} aria-hidden="true" /></button>
              <input id="restock-quantity" name="quantity" type="number" min="1" step="1" required />
              <button type="button" aria-label="Increase quantity" title="Increase quantity" onClick={(event) => {
                const input = event.currentTarget.form?.elements.namedItem("quantity");
                if (input instanceof HTMLInputElement) input.stepUp();
              }}><Plus size={18} aria-hidden="true" /></button>
            </div>
          </div>
          <label>Note (optional)<input name="note" placeholder="e.g. New delivery" /></label>
          <div className="inventory-form-footer"><button type="submit">Add stock</button></div>
        </div>
      </form>}
      {formMode === "movement" && <form onSubmit={adjustStock}><div className="inventory-form-grid"><label>Variant / SKU<select name="variantId" required>{movementRows.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku} · {productName(variant.productId)} · {variantLabel(variant)} / {variant.size} · {variant.quantity} on hand</option>)}</select></label><label>Direction<select name="direction"><option value="in">Stock in</option><option value="out">Stock out</option></select></label><label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label><label>Reason<select name="reason"><option>Received</option><option>Sale</option><option>Return</option><option>Transfer</option><option>Damaged</option><option>Count correction</option><option>Other</option></select></label><label className="inventory-wide-field">Note<input name="note" placeholder="What changed, and why?" required /></label></div><div className="inventory-form-footer"><span>Stock cannot be reduced below zero.</span><button type="submit" disabled={!movementRows.length}>Record movement</button></div></form>}
    </section>;

  const catalogueToolbar = <><div className="inventory-toolbar"><label className="inventory-search"><Search size={17} /><span className="sr-only">Search products, SKU, colour or fabric</span><input value={query} onChange={(event) => { setQuery(event.target.value); if (formMode === "movement") setFormMode(null); }} placeholder="Search product, SKU, colour or fabric" /></label><select aria-label="Filter stock status" value={filter} onChange={(event) => { setFilter(event.target.value); if (formMode === "movement") setFormMode(null); }}><option value="all">All stock states</option><option value="uncounted">Not counted</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><button type="button" className="inventory-quiet-button" disabled={!movementRows.length} title="Adjust stock for a SKU and record the reason" onClick={() => { setFormMode("movement"); showMessage(""); }}>Record movement</button></div>{formMode === "movement" && formPanel}</>;

  return <>
    <div className="eyebrow">READY-TO-WEAR / GARMENT INVENTORY</div>
    {detailView && <Link prefetch={false} className="text-link inventory-back" href={catalogueHref}><ArrowLeft size={14} /> Back to product catalogue</Link>}
    <div className="page-heading inventory-heading">
      <div><h1>{title}</h1><p>{intro}</p></div>
      {view !== "activity" && !detailView && <div className="inventory-actions">
        <button type="button" className="inventory-quiet-button" onClick={() => { setFormMode("product"); showMessage(""); }}><Plus size={16} /> Add product</button>
        <button type="button" className="create-bill-button" onClick={() => {
          openVariantForm();
        }}><PackagePlus size={16} /> Add variant</button>
      </div>}
    </div>
    {message && !formMode && <div className="inventory-message" data-tone={messageTone} role={messageTone === "success" ? "status" : "alert"}>{message}<button type="button" aria-label="Dismiss message" title="Dismiss message" onClick={() => showMessage("")}><X size={15} /></button></div>}
    {view !== "activity" && (formMode === "product" || (formMode === "variant" && !sizeVariant)) && (
      <InventoryDrawer label={formMode === "product" ? "Add product" : "Add variant"} onClose={() => setFormMode(null)}>
        {formPanel}
      </InventoryDrawer>
    )}
    {view === "overview" && <><div className="inventory-summary-grid"><article className="summary-card primary"><span>Products</span><strong>{loaded ? inventory.products.length : "—"}</strong><small>Ready-to-wear only</small></article><article className="summary-card"><span>Units on hand</span><strong>{loaded ? totalOnHand : "—"}</strong><small>Across all variants</small></article><article className="summary-card" data-tone={lowStock.length ? "warning" : "neutral"}><span>Low stock</span><strong>{loaded ? lowStock.length : "—"}</strong><small>At or below alert level</small></article><article className="summary-card" data-tone={outOfStock.length ? "danger" : "neutral"}><span>Out of stock</span><strong>{loaded ? outOfStock.length : "—"}</strong><small>Size entries with zero units</small></article></div><div className="inventory-overview-grid"><section className="panel inventory-overview-panel"><div className="eyebrow">NEEDS ATTENTION</div><h2>Stock alerts</h2>{lowStock.length || outOfStock.length ? <div className="inventory-alerts">{[...outOfStock, ...lowStock].slice(0, 5).map((variant) => <div key={variant.id}><Link prefetch={false} href={`${catalogueHref}&product=${encodeURIComponent(variant.productId)}`}><strong>{variantName(variant.id)}</strong></Link><StatusBadge status={variant.quantity === 0 ? "Out of stock" : `${variant.quantity} left`} tone={variant.quantity === 0 ? "danger" : "warning"} /></div>)}</div> : <p>No low-stock alerts. Alerts will appear when variants are added and reach their threshold.</p>}</section></div></>}
    {view === "products" && !detailView && <>{canImport && <CatalogueImport />}{catalogueToolbar}<section className="panel inventory-list-panel inventory-catalogue">
      <div className="panel-heading"><h2>Product catalogue <span className="heading-count">{visibleProducts.length}</span></h2></div>
      <div className="table-wrap">
        <table className="order-table inventory-catalogue-table">
          <thead><tr><th>Product</th><th>Clothing type</th><th>Price</th><th>Colours / fabrics</th><th>Sizes in stock</th><th>Units on hand</th><th>Stock alerts</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleProducts.map((product) => {
            const rows = rowsByProduct.get(product.id) ?? [];
            const colours = distinctLabels([...(product.colours ?? []), ...rows.map((row) => row.colour || row.fabric || "")]);
            const sizes = distinctLabels(rows.filter((row) => stockKnown(row) && row.quantity > 0).map((row) => row.size));
            const outCount = rows.filter((row) => stockKnown(row) && row.quantity === 0).length;
            const lowCount = rows.filter((row) => stockKnown(row) && row.quantity > 0 && row.quantity <= row.reorderAt).length;
            return <Fragment key={product.id}><tr>
              <td><Link prefetch={false} className="inventory-catalogue-product" href={`${catalogueHref}&product=${encodeURIComponent(product.id)}`}>
                {product.photo && <Image src={product.photo} width={38} height={50} alt="" unoptimized />}<strong>{product.name}</strong>
              </Link></td>
              <td>{product.type}</td><td>{money(product.price)}</td>
              <td>{colours.join(", ") || "—"}</td>
              <td>{sizes.join(", ") || (rows.some(row => !stockKnown(row)) ? "Not counted" : rows.length ? "None in stock" : "—")}</td>
              <td>{rows.some(row => !stockKnown(row)) ? "Counts needed" : rows.length ? rows.reduce((sum, row) => sum + row.quantity, 0) : "Not counted"}</td>
              <td><div className="order-status-stack">{outCount > 0 && <StatusBadge status={`${outCount} out`} tone="danger" />}{lowCount > 0 && <StatusBadge status={`${lowCount} low`} tone="warning" />}{!outCount && !lowCount && "—"}</div></td>
              <td><button type="button" className="inventory-quiet-button" aria-label={`Add variant for ${product.name}`} onClick={() => {
                openVariantForm(product.id);
              }}>Add variant</button></td>
            </tr>
            </Fragment>;
          })}</tbody>
        </table>
      </div>
      {!visibleProducts.length && <p className="empty-state">{inventory.products.length ? "No products match this search or stock filter." : "No ready-to-wear products yet. Add a product to get started."}</p>}
    </section></>}
    {detailView && selected && <><section className="panel inventory-product-detail">
      {selected.photo && <Image src={selected.photo} width={112} height={148} alt={selected.name} unoptimized />}
      <div>
        <h2>Product details</h2>
        <div className="inventory-detail-colours">
          <strong>Colours</strong>
          {detailColours.length ? <ul aria-label="Product colours">
            {detailColours.map((colour) => {
              const savedRow = stockRows.find((row) => normalize(row.colour) === normalize(colour) && inventory.visuals?.[variantKey(row)]?.swatch);
              const savedSwatch = savedRow && inventory.visuals?.[variantKey(savedRow)]?.swatch;
              const swatch = productSwatches.find((variant) => normalize(variant.colour) === normalize(colour))?.swatch;
              const background = savedSwatch ?? (normalize(colour) === "black & white"
                ? "linear-gradient(90deg, #252527 50%, #fff 50%)"
                : swatch);
              return <li key={colour}>
                {background && <span className="inventory-colour-swatch" aria-hidden="true" style={{ background }} />}
                {colour}
              </li>;
            })}
          </ul> : <span>No colours recorded</span>}
        </div>
        <p><strong>Fabrics</strong> {distinctLabels(stockRows.map((row) => row.fabric ?? "")).join(", ") || "No fabrics recorded"}</p>
        <p><strong>Units on hand</strong> {stockRows.some(row => !stockKnown(row)) ? "Counts needed" : stockRows.length ? stockRows.reduce((sum, row) => sum + row.quantity, 0) : "Not counted"}</p>

      </div>
      <div className="inventory-actions inventory-product-actions">
        <button type="button" className="inventory-quiet-button" aria-expanded={formMode === "edit-product"} onClick={() => {
          setFormMode("edit-product");
          showMessage("");
        }}>Edit product</button>
        <button type="button" className="create-bill-button" aria-expanded={formMode === "variant" && !sizeVariant} onClick={() => openVariantForm(selected.id)}>
          <PackagePlus size={16} /> Add variant
        </button>
      </div>
    </section>
    {formMode === "edit-product" && formPanel}
    <SizeChartEditor key={selected.id} scope="product" targetId={selected.catalogueId ?? selected.id} title={selected.name} initialProfile={productSizing[sizingProductId(selected.catalogueId ?? selected.id)]} />
    <section className="panel inventory-product-gallery">
      <h2>Product gallery</h2>
      {selected.photo ? <ProductGallery photos={selected.gallery ?? [selected.photo]} label={selected.name} /> : <p>Add photos using Edit product.</p>}
    </section>
    </>}
    {detailView && !selected && <p className="empty-state">{loaded ? "Product not found in this catalogue." : "Loading product…"}</p>}
    {detailView && selected && <>{catalogueToolbar}<section className="panel inventory-list-panel"><div className="panel-heading"><div><div className="eyebrow">PRODUCT REGISTER</div><h2>Stock by size <span className="heading-count">{visibleVariants.length}</span></h2></div></div>{visibleVariants.length ? <div className="inventory-stock-groups">
      {[...variantGroups].map(([key, rows]) => {
        const matchingRows = rows.filter((row) => visibleVariants.includes(row));
        const sizeRank = (size: string) => {
          const index = sizeOptions.findIndex(({ value }) => normalize(value) === normalize(size));
          return index < 0 ? sizeOptions.length : index;
        };
        matchingRows.sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
        if (!matchingRows.length) return null;
        const variant = rows[0];
        const onHand = rows.reduce((sum, row) => sum + row.quantity, 0);
        const low = rows.filter((row) => stockKnown(row) && row.quantity > 0 && row.quantity <= row.reorderAt).length;
        const soldOut = rows.filter((row) => stockKnown(row) && row.quantity === 0).length;
        const swatch = productSwatches.find((option) =>
          normalize(option.colour) === normalize(variant.colour) &&
          normalize(option.fabric ?? "") === normalize(variant.fabric ?? "")
        )?.swatch;
        const visual = inventory.visuals?.[key];
        const background = visual?.swatch ?? (normalize(variant.colour) === "black & white"
          ? "linear-gradient(90deg, #252527 50%, #fff 50%)"
          : swatch);
        return <section key={key} className="inventory-stock-group">
          <div className="inventory-stock-summary">
            <h3>
              {visual?.photo ? <Image className="inventory-fabric-thumbnail" src={visual.photo} width={32} height={32} unoptimized alt="" />
                : background && <span className="inventory-colour-swatch" aria-hidden="true" style={{ background }} />}
              {variantLabel(variant)}
            </h3>
            <dl>
              <div><dt>Price</dt><dd>{money(selected.price)}</dd></div>
              <div><dt>On hand</dt><dd>{rows.some(row => !stockKnown(row)) ? "Counts needed" : `${onHand} units`}</dd></div>
              <div><dt>Low stock</dt><dd>{low ? <StatusBadge status={`${low} size entries`} tone="warning" /> : "0 size entries"}</dd></div>
              <div><dt>Out of stock</dt><dd>{soldOut ? <StatusBadge status={`${soldOut} size entries`} tone="danger" /> : "0 size entries"}</dd></div>
            </dl>
            <button type="button" className="inventory-quiet-button" aria-label={`Add size for ${variantLabel(variant)}`}
              disabled={sizeOptions.every(({ value }) => rows.some((row) => normalize(row.size) === normalize(value)))}
              onClick={() => openVariantForm(selected.id, variant)}>Add size</button>
          </div>
          <div className="inventory-variant-gallery">
            <button type="button" className="inventory-quiet-button" onClick={() => {
              setSizeVariant(variant);
              setFormMode("edit-gallery");
              showMessage("");
            }}>Edit colour & photos</button>
            {visual?.gallery?.length ? <ProductGallery photos={visual.gallery} label={`${variantLabel(variant)} gallery`} /> : null}
          </div>
          {(formMode === "variant" || formMode === "edit-gallery") && sizeVariant && variantKey(sizeVariant) === key && <div className="inventory-inline-form">{formPanel}</div>}
          <div className="inventory-stock-subrow">
            <span className="inventory-stock-subrow-label">Stock by size</span>
            <div className="table-wrap">
              <table className="inventory-stock-sizes" aria-label={`Sizes for ${variantLabel(variant)}`}>
                <thead><tr><th scope="col">Size</th><th scope="col">Unique SKU</th><th scope="col">Quantity left</th><th scope="col">Stock status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{matchingRows.map((row) => {
                  const low = row.quantity > 0 && row.quantity <= row.reorderAt;
                  return <Fragment key={row.id}><tr>
                    <th scope="row"><strong>{row.size}</strong></th>
                    <td>{row.sku}{row.location && <small className="inventory-sku">{row.location}</small>}</td>
                    <td>{stockKnown(row) ? row.quantity : "Not counted"}</td>
                    <td><StatusBadge status={!stockKnown(row) ? "Not counted" : row.quantity === 0 ? "Sold out" : low ? "Low stock" : "In stock"} /></td>
                    <td><button type="button" className="inventory-restock-button" aria-expanded={formMode === "restock" && restockRow?.id === row.id} aria-label={`Add stock for ${variantLabel(row)}, size ${row.size}, SKU ${row.sku}`} onClick={() => {
                      setRestockRow(row);
                      setFormMode("restock");
                      showMessage("");
                    }}><Plus size={14} aria-hidden="true" /> Add stock</button></td>
                  </tr>
                  {formMode === "restock" && restockRow?.id === row.id && <tr><td className="inventory-inline-cell" colSpan={5}>{formPanel}</td></tr>}
                  </Fragment>;
                })}</tbody>
              </table>
            </div>
          </div>
        </section>;
      })}
    </div> : <div className="empty-state">{stockRows.length ? "No variants match this search or filter." : inventory.products.length ? "Add a colour or fabric variant and enter its sizes to begin tracking stock." : "No ready-to-wear products yet. Add a product, then its colour and size variants."}</div>}</section></>}
    {view === "activity" && <><div className="inventory-toolbar"><span>Every entry records the variant, reason and time.</span><button type="button" className="create-bill-button" disabled={!stockRows.length} title="Adjust stock for a SKU and record the reason" onClick={() => { setFormMode("movement"); showMessage(""); }}><Plus size={16} /> Record movement</button></div>{formMode === "movement" && formPanel}<section className="panel inventory-list-panel"><div className="panel-heading"><div><div className="eyebrow">STOCK LEDGER</div><h2>Recent movements <span className="heading-count">{inventory.movements.length}</span></h2></div></div>{inventory.movements.length ? <div className="table-wrap"><table className="order-table inventory-table"><thead><tr><th>When</th><th>Product / variant</th><th>Reason</th><th>Change</th><th>Note</th></tr></thead><tbody>{inventory.movements.map((movement) => <tr key={movement.id}><td>{time(movement.occurredAt)}</td><td className="order-reference"><strong>{variantName(movement.variantId)}</strong><span>{inventory.variants.find((variant) => variant.id === movement.variantId)?.sku}</span></td><td>{movement.reason}</td><td><span className={`inventory-change ${movement.change > 0 ? "in" : "out"}`}>{movement.change > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{movement.change > 0 ? "+" : ""}{movement.change}</span></td><td>{movement.note}</td></tr>)}</tbody></table></div> : <div className="empty-state">No stock activity yet. Add a variant with a counted opening quantity or record a movement.</div>}</section></>}
  </>;
}

/** "Show as a new arrival", which ends by itself: ticking it shows the piece as new for 30 days, and the date can be changed. */
function NewArrivalField({ isNew, newUntil }: { isNew: boolean; newUntil?: string }) {
  const today = daysFromToday(0);
  const expired = isNew && Boolean(newUntil) && newUntil! < today;
  const [on, setOn] = useState(isNew && !expired);
  const [until, setUntil] = useState(!expired && newUntil ? newUntil : daysFromToday(newArrivalDays));
  return <div className="inventory-new-arrival">
    <label className="inventory-check"><input type="checkbox" name="isNew" checked={on} onChange={(event) => { setOn(event.target.checked); if (event.target.checked && !newUntil) setUntil(daysFromToday(newArrivalDays)); }} /> Show as a new arrival</label>
    {on && <label className="inventory-new-until">New until<input type="date" name="newUntil" min={today} value={until} onChange={(event) => setUntil(event.target.value)} required /></label>}
    <small>{on ? `Shows in New Arrivals until ${formatDay(until)}, then drops out by itself.` : expired ? `Was new until ${formatDay(newUntil!)}. Tick to show it as new again for ${newArrivalDays} days.` : `Ticking shows it as new for ${newArrivalDays} days.`}</small>
  </div>;
}
const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
