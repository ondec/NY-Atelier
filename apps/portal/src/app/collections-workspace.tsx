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
  featuredOn: FeaturedOn;
  order: number;
  /** Where featured, the hero shows the campaign photos as a carousel, or a launch video. */
  heroMode?: "photos" | "video";
  /** An HTTPS link to an MP4 or WebM file (kept when switching back to photos). */
  heroVideo?: string;
  /** Shown under the pieces: up to three chapters on why the collection is unique, each with close-up shots. */
  story?: StoryChapter[];
};
export type StoryChapter = { title: string; text: string; photos: string[] };
const chapterSlots = [0, 1, 2];
/** The saved chapters (older records held one chapter as an object). */
const chaptersOf = (entry: { story?: StoryChapter[] | StoryChapter }) => Array.isArray(entry.story) ? entry.story : entry.story ? [entry.story] : [];
const videoLink = /^(https:\/\/[^\s]+|\/[A-Za-z0-9\/_.-]+)\.(mp4|webm)(\?[^\s]*)?$/i;

/** The three home heroes a collection can lead. Each site features at most one collection. */
export type FeatureSite = "website" | "rtw" | "app";
export type FeaturedOn = Record<FeatureSite, boolean>;
export const featureSites: { id: FeatureSite; label: string; place: string }[] = [
  { id: "website", label: "Feature on website", place: "the website home" },
  { id: "rtw", label: "Feature on RTW store", place: "the RTW store home" },
  { id: "app", label: "Feature on app", place: "the app home" },
];
const notFeatured: FeaturedOn = { website: false, rtw: false, app: false };

/** Older records had one "Feature on Home" flag, which drove the RTW store and the app. */
export function normaliseCollection(entry: Collection & { featured?: boolean }): Collection {
  const { featured, ...rest } = entry;
  const flags = entry.featuredOn && typeof entry.featuredOn === "object" ? entry.featuredOn : { ...notFeatured, rtw: featured === true, app: featured === true };
  return { ...rest, story: chaptersOf(rest), featuredOn: { website: flags.website === true, rtw: flags.rtw === true, app: flags.app === true } };
}
const featuredLabel = (entry: Collection) => {
  const places = featureSites.filter((site) => entry.featuredOn[site.id]).map((site) => site.id === "rtw" ? "RTW store" : site.id === "app" ? "app" : "website");
  return places.length ? ` · Featured on ${places.join(", ")}` : "";
};

export const collectionStorageKey = "ny-atelier-collections-v1";
export const sampleCollections: Collection[] = [{
  ...redCloverCollectionInfo,
  productIds: redCloverCollectionInfo.productIds.map((id) => `shop-${id}`),
  photos: Array.from({ length: 4 }, (_, index) => `/collections/royal-blue-stripes-${index + 1}.jpg`),
  featuredOn: { website: false, rtw: true, app: true },
  order: 1,
}];
const blank: Collection = { id: "", title: "", description: "", photos: [], productIds: [], featuredOn: notFeatured, order: 1 };
const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount);

export function readCollections(): Collection[] {
  try {
    const stored = localStorage.getItem(collectionStorageKey);
    const parsed = stored && JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normaliseCollection) : sampleCollections;
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
  const [featuredOn, setFeaturedOn] = useState<FeaturedOn>(notFeatured);
  // A site already featuring another collection waits for staff to confirm the switch.
  const [pendingSite, setPendingSite] = useState<FeatureSite>();
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
      const heroMode = data.get("heroMode") === "video" ? "video" : "photos";
      const heroVideo = String(data.get("heroVideo") ?? "").trim();
      if (heroVideo && !videoLink.test(heroVideo)) throw new Error("The launch video must be an https:// link or a /path ending in .mp4 or .webm.");
      if (heroMode === "video" && !heroVideo) throw new Error("Add the launch video link, or choose photos for the hero.");
      const story: StoryChapter[] = [];
      for (const slot of chapterSlots) {
        const chapter = { title: String(data.get(`chapter${slot}Title`) ?? "").trim(), text: String(data.get(`chapter${slot}Text`) ?? "").trim(), photos: await readGallery(data, chaptersOf(draft)[slot]?.photos ?? [], `chapter${slot}`) };
        if (chapter.title || chapter.text || chapter.photos.length) story.push(chapter);
      }
      const record: Collection = {
        id: draft.id || crypto.randomUUID(), title, description, productIds, photos, order,
        featuredOn, heroMode, heroVideo, story,
      };
      const next = [
        ...readCollections().filter((item) => item.id !== record.id).map((item) => ({
          ...item,
          featuredOn: { website: item.featuredOn.website && !featuredOn.website, rtw: item.featuredOn.rtw && !featuredOn.rtw, app: item.featuredOn.app && !featuredOn.app },
        })),
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
    setFeaturedOn(entry.featuredOn);
    setPendingSite(undefined);
    setDraft(entry);
  }

  /** Who else currently leads this site's home hero. */
  const holderOf = (site: FeatureSite) => collections.find((item) => item.id !== draft?.id && item.featuredOn[site]);

  function toggleFeature(site: FeatureSite, on: boolean) {
    if (on && holderOf(site)) { setPendingSite(site); return; }
    setPendingSite(undefined);
    setFeaturedOn((current) => ({ ...current, [site]: on }));
  }

  function answerSwitch(yes: boolean) {
    if (yes && pendingSite) setFeaturedOn((current) => ({ ...current, [pendingSite]: true }));
    setPendingSite(undefined);
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
        <h2>{featuredLabel(selected) ? "Home hero & collection photos" : "Collection photos"}</h2>
        <p className="collection-help">The first photo is the collection cover. Where the collection is featured, the photos cycle in this order on that home hero with the collection name kept in place.{featuredLabel(selected) && <strong>{featuredLabel(selected)}.</strong>}</p>
        {selected.heroMode === "video" && selected.heroVideo && <p className="collection-help">Hero: <strong>launch video</strong> · <a href={selected.heroVideo} target="_blank" rel="noreferrer">{selected.heroVideo}</a></p>}
        <div className="collection-photos">{selected.photos.map((photo, index) => (
          <figure key={index}><Image src={photo} alt={`${selected.title} campaign photo ${index + 1}`} width={200} height={260} unoptimized /><figcaption>{index === 0 ? "Cover · Slide 1" : `Slide ${index + 1}`}</figcaption></figure>
        ))}</div>
      </section>
      {chaptersOf(selected).length > 0 && <section className="panel inventory-form-panel">
        <div className="eyebrow">COLLECTION STORY</div>
        {chaptersOf(selected).map((chapter, index) => <div key={index}>
          <h2>{chapter.title || `Chapter ${index + 1}`}</h2>
          {chapter.text && <p className="collection-help">{chapter.text}</p>}
          {chapter.photos.length > 0 && <div className="collection-photos">{chapter.photos.map((photo, photoIndex) => (
            <figure key={photoIndex}><Image src={photo} alt={`${selected.title} close-up ${photoIndex + 1}`} width={200} height={260} unoptimized /><figcaption>Close-up {photoIndex + 1}</figcaption></figure>
          ))}</div>}
        </div>)}
      </section>}
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
            <div className="collection-garment-heading"><h3>{product.name} · {money(product.price)}</h3><Link prefetch={false} className="inventory-quiet-button" href={`/ready-to-wear?view=products&product=${encodeURIComponent(product.id)}`}>Manage garment</Link></div>
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
        <span className="collection-card-content"><strong>{entry.title}</strong><span>{entry.description}</span><small>{entry.productIds.length} {entry.productIds.length === 1 ? "garment" : "garments"}{featuredLabel(entry)}</small></span>
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
          <fieldset className="collection-features">
            <legend>Home hero</legend>
            <p className="collection-help">Each site shows one featured collection, so the website, RTW store and app can each lead with a different one.</p>
            {featureSites.map((site) => {
              const holder = holderOf(site.id);
              return <label className="collection-switch" key={site.id}>
                <input type="checkbox" role="switch" checked={featuredOn[site.id]} onChange={(event) => toggleFeature(site.id, event.target.checked)} />
                <span className="collection-switch-track" aria-hidden="true" />
                <span><strong>{site.label}</strong><small>{featuredOn[site.id] ? `Leads ${site.place}.` : holder ? `${holder.title} is featured there now.` : "Nothing is featured there now."}</small></span>
              </label>;
            })}
            {pendingSite && <div className="collection-confirm" role="alertdialog" aria-labelledby="collection-confirm-text">
              <p id="collection-confirm-text"><strong>{holderOf(pendingSite)?.title}</strong> is featured on {featureSites.find((site) => site.id === pendingSite)?.place}. Turn it off there and feature {draft.title || "this collection"} instead?</p>
              <div><button type="button" className="inventory-quiet-button" onClick={() => answerSwitch(false)}>No, keep it</button><button type="button" className="create-bill-button" onClick={() => answerSwitch(true)}>Yes, switch</button></div>
            </div>}
            <p className="collection-help">Changes go live when you save.</p>
          </fieldset>
          <GalleryFields photos={draft.photos} label="Campaign photos" />
          <p className="collection-help">Choose the cover first. Portrait photos work best for the mobile hero.</p>
          <fieldset className="inventory-size-entries">
            <legend>Hero style</legend>
            <p className="collection-help">Where this collection is featured, its hero can cycle through the campaign photos or play a launch video. You can switch at any time.</p>
            <div className="collection-hero-mode">
              <label className="collection-check"><input type="radio" name="heroMode" value="photos" defaultChecked={(draft.heroMode ?? "photos") === "photos"} /><span>Photo carousel</span></label>
              <label className="collection-check"><input type="radio" name="heroMode" value="video" defaultChecked={draft.heroMode === "video"} /><span>Launch video</span></label>
            </div>
            <label className="inventory-wide-field">Launch video link<input name="heroVideo" type="url" inputMode="url" maxLength={2000} defaultValue={draft.heroVideo ?? ""} placeholder="https://…/launch.mp4" /></label>
            <p className="collection-help">An https:// link to an MP4 or WebM file. It plays muted and on loop, with the cover photo shown while it loads.</p>
          </fieldset>
          <fieldset className="inventory-size-entries">
            <legend>Collection story</legend>
            <p className="collection-help">Shown under the pieces: up to three chapters on what makes this collection unique (the inspiration, the cloth, the making), each with its own close-up shots. Leave a chapter empty to hide it.</p>
            {chapterSlots.map((slot) => { const chapter = chaptersOf(draft)[slot]; return <div className="collection-chapter" key={slot}>
              <h3>Chapter {slot + 1}</h3>
              <label className="inventory-wide-field">Heading<input name={`chapter${slot}Title`} maxLength={80} defaultValue={chapter?.title ?? ""} placeholder={["e.g. The inspiration", "e.g. The cloth", "e.g. Made by hand"][slot]} /></label>
              <label className="inventory-wide-field">Text<textarea name={`chapter${slot}Text`} maxLength={1200} rows={4} defaultValue={chapter?.text ?? ""} /></label>
              <GalleryFields photos={chapter?.photos} label={`Chapter ${slot + 1} close-ups`} name={`chapter${slot}`} />
            </div>; })}
          </fieldset>
          <fieldset className="inventory-size-entries">
            <legend>Link garments</legend>
            <p className="collection-help">Select existing garments. Every colour or fabric becomes an edition card. Manage prices, sizes, quantities and variant photos in Products &amp; variants.</p>
            <div className="collection-picker">{inventory.products.map((product) => <label className="collection-check" key={product.id}>
              <input type="checkbox" name="products" value={product.catalogueId ?? product.id} defaultChecked={draft.productIds.includes(product.catalogueId ?? product.id) || draft.productIds.includes(product.id)} />
              <span>{product.name}</span><small>{money(product.price)}</small>
            </label>)}</div>
          </fieldset>
          {error && <p className="collection-error" role="alert">{error}</p>}
          <div className="inventory-form-footer"><span>Saved in this browser for review.</span><button type="submit" disabled={saving || pendingSite !== undefined}>{saving ? "Saving…" : "Save collection"}</button></div>
        </form>
      </section>
    </InventoryDrawer>}
  </>;
}
