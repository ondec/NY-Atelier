"use client";

import Image from "next/image";
import SizeChartEditor from "./size-chart-editor";
import { productSizing } from "../../../mobile/src/data/product-sizing";
import { sizingProductId } from "../../../mobile/src/lib/sizing";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "@/components/icons";
import { type FormEvent, useEffect, useState } from "react";
import { redCloverCollectionInfo } from "../../../mobile/src/data/collection-info";
import { demoStock } from "../../../mobile/src/data/demo-stock";
import { emptyInventory, inventoryChanged, parseInventory, storageKey, variantKey, variantLabel, type Variant } from "@/lib/inventory";
import { GalleryFields, InventoryDrawer, readGallery } from "./catalogue-editor";

export type Collection = {
  id: string;
  title: string;
  description: string;
  photos: string[];
  productIds: string[];
  featured: boolean;
  order: number;
};

const collectionStorageKey = "ny-atelier-collections-v1";
export const sampleCollections: Collection[] = [{
  ...redCloverCollectionInfo,
  productIds: redCloverCollectionInfo.productIds.map((id) => `shop-${id}`),
  photos: Array.from({ length: 4 }, (_, index) => `/collections/royal-blue-stripes-${index + 1}.jpg`),
  featured: true,
  order: 1,
}];
const blank: Collection = { id: "", title: "", description: "", photos: [], productIds: [], featured: false, order: 1 };
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export function readCollections(): Collection[] {
  try {
    const stored = localStorage.getItem(collectionStorageKey);
    const parsed = stored && JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : sampleCollections;
  } catch {
    return sampleCollections;
  }
}

export default function CollectionsWorkspace() {
  const [collections, setCollections] = useState(sampleCollections);
  const [inventory, setInventory] = useState(emptyInventory);
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<Collection>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = collections.find((entry) => entry.id === selectedId);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setInventory(parseInventory(localStorage.getItem(storageKey)));
      setCollections(readCollections());
    };
    queueMicrotask(() => { if (active) refresh(); });
    window.addEventListener(inventoryChanged, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener(inventoryChanged, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    const description = String(data.get("description")).trim();
    const productIds = data.getAll("products").map(String);
    const order = Number(data.get("order"));
    if (!title || !description || !productIds.length || !Number.isInteger(order) || order < 1) {
      setError("Enter a name and description, choose at least one garment, and enter a valid display order.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const photos = await readGallery(data, draft.photos);
      if (!photos.length) throw new Error("Add at least one campaign photo.");
      const record: Collection = {
        id: draft.id || crypto.randomUUID(), title, description, productIds, photos, order,
        featured: data.has("featured"),
      };
      const next = [
        ...readCollections().filter((item) => item.id !== record.id).map((item) =>
          record.featured ? { ...item, featured: false } : item
        ),
        record,
      ];
      localStorage.setItem(collectionStorageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("ny-atelier-collections-changed"));
      setCollections(next);
      setSelectedId(record.id);
      setDraft(undefined);
      setNotice("Collection saved.");
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "QuotaExceededError"
        ? failure.message : "Browser storage is full. Try using fewer photos.");
    } finally {
      setSaving(false);
    }
  }

  function openEditor(entry: Collection) {
    setError("");
    setDraft(entry);
  }

  function closeEditor() {
    if (!saving) setDraft(undefined);
  }

  const ordered = [...collections].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return <>
    <div className="eyebrow">READY-TO-WEAR</div>
    {selected && <button className="text-link collection-back" onClick={() => setSelectedId(undefined)}><ArrowLeft size={14} /> Back to collections</button>}
    <div className="page-heading inventory-heading">
      <div><h1>{selected?.title ?? "Collections."}</h1><p>{selected?.description ?? "Group garments and prepare campaign content for the customer shop."}</p></div>
      <button type="button" className="create-bill-button" onClick={() => openEditor(selected ?? { ...blank, order: (ordered.at(-1)?.order ?? 0) + 1 })}>
        {selected ? "Edit collection" : <><Plus size={16} /> Add collection</>}
      </button>
    </div>
    {notice && <div className="inventory-message" role="status">{notice}</div>}
    {selected ? <>
      <section className="panel inventory-form-panel">
        <div className="eyebrow">CAMPAIGN · DISPLAY ORDER {selected.order}</div>
        <h2>{selected.featured ? "Home hero & collection photos" : "Collection photos"}</h2>
        <p className="collection-help">The first photo is the collection cover. When featured on Home, the photos cycle in this order with the collection name kept in place.</p>
        <div className="collection-photos">{selected.photos.map((photo, index) => (
          <figure key={index}><Image src={photo} alt={`${selected.title} campaign photo ${index + 1}`} width={200} height={260} unoptimized /><figcaption>{index === 0 ? "Cover · Slide 1" : `Slide ${index + 1}`}</figcaption></figure>
        ))}</div>
      </section>
      <SizeChartEditor key={selected.id} scope="collection" targetId={selected.id} title={selected.title} productIds={selected.productIds} initialProfile={productSizing[sizingProductId(selected.productIds[0] ?? "")]} />
      <section className="panel inventory-form-panel">
        <div className="eyebrow">CUSTOMER SHOP PREVIEW</div>
        <h2>Garments & editions</h2>
        <p className="collection-help">Each colour or fabric has its own card in the collection. Prices, photos and stock come from garment inventory.</p>
        {selected.productIds.map((id) => {
          const product = inventory.products.find((item) => item.id === id || item.catalogueId === id);
          if (!product) return <p key={id}>This linked garment is no longer available.</p>;
          const groups = new Map<string, Variant[]>();
          for (const row of inventory.variants.filter((row) => row.productId === product.id)) {
            const key = variantKey(row);
            groups.set(key, [...(groups.get(key) ?? []), row]);
          }
          return <div className="collection-garment" key={id}>
            <div className="collection-garment-heading"><h3>{product.name} · {money(product.price)}</h3><Link className="inventory-quiet-button" href={`/?section=inventory&view=products&product=${encodeURIComponent(product.id)}`}>Manage garment</Link></div>
            {groups.size ? <div className="collection-editions">{Array.from(groups, ([key, rows]) => {
              const variant = rows[0];
              const visual = inventory.visuals?.[key];
              const photo = visual?.gallery?.[0];
              const sample = demoStock[(product.catalogueId ?? product.id).slice(5)]?.find((entry) => entry.colour === variant.colour && entry.fabric === variant.fabric);
              return <article className="collection-edition" key={key}>
                {photo ? <Image src={photo} alt={variantLabel(variant)} width={130} height={100} unoptimized /> : <div className="collection-swatch" style={{ backgroundColor: visual?.swatch ?? sample?.swatch ?? "#eeeae1", backgroundImage: visual?.photo ? `url("${visual.photo}")` : undefined }} aria-label={variantLabel(variant)} />}
                <strong>{variantLabel(variant)} edition</strong><span>{money(product.price)}{visual?.gallery?.length ? ` · ${visual.gallery.length} photos` : ""}</span>
                <ul>{rows.map((row) => <li key={row.id}><b>{row.size}</b> <span>{row.quantity} on hand</span><small>{row.sku}</small></li>)}</ul>
              </article>;
            })}</div> : <p className="collection-help">Add a colour or fabric variant in garment inventory to show an edition here.</p>}
          </div>;
        })}
      </section>
    </> : <div className="collection-list">{ordered.map((entry) => (
      <button type="button" className="panel collection-card" key={entry.id} onClick={() => setSelectedId(entry.id)}>
        <Image src={entry.photos[0]} alt="" width={300} height={160} unoptimized />
        <span className="collection-card-content"><strong>{entry.title}</strong><span>{entry.description}</span><small>{entry.productIds.length} {entry.productIds.length === 1 ? "garment" : "garments"}{entry.featured ? " · Featured on Home" : ""}</small></span>
      </button>
    ))}</div>}

    {draft && <InventoryDrawer label={draft.id ? "Edit collection" : "Add collection"} onClose={closeEditor}>
      <section className="panel inventory-form-panel">
        <div className="inventory-form-title"><h2>{draft.id ? "Edit collection" : "Add a collection"}</h2><button type="button" aria-label="Close form" disabled={saving} onClick={closeEditor}><X size={18} /></button></div>
        <form onSubmit={save}>
          <div className="inventory-form-grid">
            <label className="inventory-wide-field">Collection name<input name="title" required maxLength={80} defaultValue={draft.title} placeholder="e.g. Red Clover Set" /></label>
            <label className="inventory-wide-field">Collection description<textarea name="description" required maxLength={500} rows={4} defaultValue={draft.description} placeholder="Describe the look, inspiration or pieces in this collection." /></label>
            <label>Display order<input type="number" name="order" min={1} step={1} required defaultValue={draft.order} /></label>
          </div>
          <label className="collection-check"><input type="checkbox" name="featured" defaultChecked={draft.featured} /> Feature on Home</label>
          <p className="collection-help">One collection can be featured at a time. Its name stays on the hero as the campaign photos cycle.</p>
          <GalleryFields photos={draft.photos} label="Campaign photos" />
          <p className="collection-help">Choose the cover first. Portrait photos work best for the mobile hero.</p>
          <fieldset className="inventory-size-entries">
            <legend>Link garments</legend>
            <p className="collection-help">Select existing garments. Every colour or fabric becomes an edition card. Manage prices, sizes, quantities and variant photos in Products &amp; variants.</p>
            <div className="collection-picker">{inventory.products.map((product) => <label className="collection-check" key={product.id}>
              <input type="checkbox" name="products" value={product.catalogueId ?? product.id} defaultChecked={draft.productIds.includes(product.catalogueId ?? product.id) || draft.productIds.includes(product.id)} />
              <span>{product.name}</span><small>{money(product.price)}</small>
            </label>)}</div>
          </fieldset>
          {error && <p className="collection-error" role="alert">{error}</p>}
          <div className="inventory-form-footer"><span>Saved in this browser for review.</span><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save collection"}</button></div>
        </form>
      </section>
    </InventoryDrawer>}
  </>;
}
