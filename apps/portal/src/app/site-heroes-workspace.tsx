"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { ChevronDown, Trash2, Upload } from "@/components/icons";
import type { SiteHero, SiteHeroes } from "@/lib/studio-catalogue-store";
import { collectionStorageKey, readCollections, type Collection } from "./collections-workspace";

export const heroesKey = "ny-atelier-site-heroes-v1";
/** Fired after the hero settings change, so the catalogue sync shares them. */
export const heroesChanged = "ny-atelier-heroes-changed";

type Site = "website" | "rtw" | "services";
type Words = Required<Pick<SiteHero, "eyebrow" | "title" | "text" | "buttonLabel" | "buttonTo">>;
// What each hero shows on the site today. Files already on the website are kept as "site:/path".
const editorial = Array.from({ length: 7 }, (_, i) => `site:/images/editorial/0${i + 1}-landscape.webp`);
const films = Array.from({ length: 6 }, (_, i) => `site:/videos/our-story/0${i + 1}.mp4`);
const sites: { id: Site; label: string; featured?: string; current: SiteHero & Words }[] = [
  { id: "website", label: "Website home", featured: "The collection featured on the website.",
    current: { use: "custom", style: "photos", media: editorial, eyebrow: "THE READY-TO-WEAR EDIT", title: "Meet the new pieces.", text: "Explore the latest additions to NY Atelier ready-to-wear.", buttonLabel: "EXPLORE THE SHOP", buttonTo: "rtw" } },
  { id: "rtw", label: "RTW Store", featured: "The collection featured on the RTW Store, with its photos or launch video.",
    current: { use: "default", style: "photos", media: [], eyebrow: "NEW SEASON", title: "Ready to wear.", text: "Pieces made in Accra, ready to take home.", buttonLabel: "SEE THE COLLECTION", buttonTo: "featured" } },
  { id: "services", label: "Services",
    current: { use: "custom", style: "video", media: films, eyebrow: "THE NY SERVICES", title: "Services with intention.", text: "Exclusive fashion services for discerning clients. From bespoke tailoring to the finishing touch, the NY experience begins with understanding you.", buttonLabel: "BOOK AN APPOINTMENT", buttonTo: "appointment" } },
];

/** Saved but not yet published heroes, shared with the catalogue like the published ones. */
export const heroDraftsKey = "ny-atelier-site-hero-drafts-v1";
function readStored(key: string): SiteHeroes {
  try { const value = JSON.parse(localStorage.getItem(key) ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  catch { return {}; }
}
/** What the sites show (published). */
export const readHeroes = () => readStored(heroesKey);
export const readHeroDrafts = () => readStored(heroDraftsKey);

/** The saved hero, or what the site shows today when nothing has been saved yet. */
function heroFor(site: Site, saved: SiteHeroes, featuredOn: Partial<Record<Site, boolean>>): SiteHero {
  const info = sites.find((entry) => entry.id === site)!;
  if (saved[site]) return { ...info.current, ...saved[site] };
  return site === "website" && featuredOn.website ? { ...info.current, use: "default" } : info.current;
}

/**
 * Catalogue manager: the hero at the top of the website home, the RTW Store and Services. Each opens with what the
 * site shows now (its photos or films, heading, text and button), ready to change. The website home and the RTW Store
 * can instead show the collection featured there.
 */
export default function SiteHeroesWorkspace({ websiteBase }: { websiteBase: string }) {
  const [site, setSite] = useState<Site>("website");
  const [heroes, setHeroes] = useState<SiteHeroes>({});
  const [drafts, setDrafts] = useState<SiteHeroes>({});
  const [featuredOn, setFeaturedOn] = useState<Partial<Record<Site, boolean>>>({});
  const [draft, setDraft] = useState<SiteHero>(sites[0].current);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const info = sites.find((entry) => entry.id === site)!;
  /** What the site shows now, including which collection is featured there. */
  const live = (at: Site, list = collections): SiteHero => {
    const featuredId = at === "services" ? undefined : list.find((entry) => entry.featuredOn?.[at])?.id;
    return { ...heroFor(at, heroes, featuredOn), ...(featuredId ? { featuredId } : {}) };
  };
  /** The last saved version: a draft if there is one, else what is published. */
  const savedFor = (at: Site) => drafts[at] ?? live(at);
  const published = live(site);
  const saved = savedFor(site);
  /** Files already on the website ("site:/…") load from the website; uploads load from here. */
  const src = (path: string) => path.startsWith("site:") ? `${websiteBase.replace(/\/$/, "")}${path.slice(5)}` : path;

  useEffect(() => {
    let first = true;
    const refresh = () => {
      const stored = readHeroes(); const storedDrafts = readHeroDrafts(); const list = readCollections();
      const featured = { website: list.some((entry) => entry.featuredOn?.website), rtw: list.some((entry) => entry.featuredOn?.rtw) };
      setHeroes(stored); setDrafts(storedDrafts); setFeaturedOn(featured); setCollections(list);
      if (first) {
        first = false;
        const featuredId = list.find((entry) => entry.featuredOn?.website)?.id;
        setDraft(storedDrafts.website ?? { ...heroFor("website", stored, featured), ...(featuredId ? { featuredId } : {}) });
      }
    };
    queueMicrotask(refresh);
    window.addEventListener(heroesChanged + "-loaded", refresh);
    return () => window.removeEventListener(heroesChanged + "-loaded", refresh);
  }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 5000); return () => window.clearTimeout(timer); }, [notice]);

  const featuredSite = site === "services" ? undefined : site;
  const currentFeatured = published.featuredId;
  const chosen = draft.featuredId;
  const chosenCollection = collections.find((entry) => entry.id === chosen);
  const same = (a: SiteHero, b: SiteHero) => JSON.stringify({ ...a, featuredId: a.use === "default" ? a.featuredId : undefined }) === JSON.stringify({ ...b, featuredId: b.use === "default" ? b.featuredId : undefined });
  const changed = !same(draft, saved);
  /** Saved changes the sites don't show yet. */
  const unpublished = (at: Site) => Boolean(drafts[at]) && !same(drafts[at]!, live(at));
  const update = (patch: Partial<SiteHero>) => { setDraft((current) => ({ ...current, ...patch })); setNotice(""); };
  function choose(next: Site) {
    if (next === site) return;
    if (changed && !window.confirm("Leave without saving your changes to this hero?")) return;
    setSite(next); setDraft(savedFor(next)); setError(""); setNotice(""); setLink("");
  }
  function setStyle(style: SiteHero["style"]) {
    if (style === draft.style) return;
    if (draft.media.length && !window.confirm(`Switching to ${style === "video" ? "video" : "photos"} removes the ${draft.style === "video" ? "videos" : "photos"} listed. Continue?`)) return;
    update({ style, media: [] });
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    if (!files.length) return;
    if (draft.media.length + files.length > 8) { setError("A hero can hold up to eight photos or videos. Remove some first."); return; }
    setUploading(true); setError("");
    try {
      const added: string[] = [];
      for (const file of files) {
        const body = new FormData(); body.set("file", file);
        const response = await fetch("/api/studio/media", { method: "POST", body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message ?? "Couldn’t upload the file.");
        added.push(result.path);
      }
      setDraft((current) => ({ ...current, media: [...current.media, ...added] }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t upload the file."); } finally { setUploading(false); }
  }
  function addLink() {
    const value = link.trim();
    const valid = draft.style === "video" ? /^https:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(value) : /^https:\/\/\S+$/i.test(value);
    if (!valid) { setError(draft.style === "video" ? "Use an https:// link ending in .mp4 or .webm." : "Use an https:// link to a photo."); return; }
    if (draft.media.length >= 8) { setError("A hero can hold up to eight photos or videos. Remove some first."); return; }
    update({ media: [...draft.media, value] }); setLink(""); setError("");
  }
  const move = (index: number, by: number) => { const media = [...draft.media]; const [item] = media.splice(index, 1); media.splice(index + by, 0, item); update({ media }); };
  function check(): boolean {
    setError("");
    if (draft.use === "custom") {
      if (!draft.media.length) { setError(`Add at least one ${draft.style === "video" ? "video" : "photo"}.`); return false; }
      if (!draft.title?.trim()) { setError("Add a heading."); return false; }
      if (draft.buttonLabel?.trim() && !draft.buttonTo) { setError("Choose where the button goes."); return false; }
    } else if (!draft.featuredId || !featuredSite) { setError("Choose the collection to feature."); return false; }
    return true;
  }
  function storeDrafts(next: SiteHeroes) {
    localStorage.setItem(heroDraftsKey, JSON.stringify(next)); setDrafts(next);
  }
  /** Save: keeps the changes here for later; the sites don't change. */
  function save() {
    if (!check()) return;
    storeDrafts({ ...drafts, [site]: draft });
    window.dispatchEvent(new Event(heroesChanged));
    setNotice("Saved. Publish when you want it on the site.");
  }
  /** Publish: the saved hero goes live on the site. */
  function publish() {
    if (!check()) return;
    if (!window.confirm(`Publish this hero to the ${info.label}? It shows on the site straight away.`)) return;
    if (draft.use === "default" && featuredSite && draft.featuredId !== currentFeatured) {
      // One collection is featured per site, as in Collections: the chosen one takes over from the last.
      const list = readCollections().map((entry) => ({ ...entry, featuredOn: { ...entry.featuredOn, [featuredSite]: entry.id === draft.featuredId } }));
      localStorage.setItem(collectionStorageKey, JSON.stringify(list));
      setCollections(list); setFeaturedOn((current) => ({ ...current, [featuredSite]: true }));
      window.dispatchEvent(new Event("ny-atelier-collections-changed"));
    }
    const { featuredId: _featured, ...hero } = draft; void _featured;
    const next = { ...heroes, [site]: hero };
    localStorage.setItem(heroesKey, JSON.stringify(next)); setHeroes(next);
    const rest = { ...drafts }; delete rest[site]; storeDrafts(rest);
    window.dispatchEvent(new Event(heroesChanged));
    setNotice(`Published. The ${info.label} hero updates on the site in a moment.`);
  }

  const own = draft.use === "custom";
  const kind = draft.style === "video" ? "video" : "photo";
  const preview = own ? draft.media[0] : undefined;
  const words = (draft.title ?? "").trim().split(/\s+/);
  const tabNote = (entry: typeof sites[number]) => { if (unpublished(entry.id)) return "Saved, not published"; const hero = live(entry.id); return hero.use === "default" ? (collections.find((item) => item.id === hero.featuredId)?.title ?? "Featured collection") : hero.style === "video" ? `${hero.media.length} video${hero.media.length === 1 ? "" : "s"}` : `${hero.media.length} photo${hero.media.length === 1 ? "" : "s"}`; };

  return <>
    <div className="eyebrow">READY-TO-WEAR</div>
    <div className="page-heading inventory-heading"><div><h1>Site heroes.</h1><p>The large opening section of the website home, the RTW Store and Services. Change a hero and Save to keep working on it. Publish puts it on the site.</p></div></div>
    <div className="hero-tabs" role="tablist" aria-label="Site">
      {sites.map((entry) => <button key={entry.id} type="button" role="tab" aria-selected={site === entry.id} className={site === entry.id ? "is-active" : ""} onClick={() => choose(entry.id)}>
        <span>{entry.label}</span><small>{tabNote(entry)}</small>
      </button>)}
    </div>
    <div className="hero-editor">
      <div className="hero-form">
        {info.featured && <section className="panel hero-card">
          <h2>What shows</h2>
          <div className="hero-choice">
            <label className={own ? "is-active" : ""}><input type="radio" name="use" checked={own} onChange={() => update({ use: "custom" })} /><span><strong>Photos or video</strong><small>Set below.</small></span></label>
            <label className={own ? "" : "is-active"}><input type="radio" name="use" checked={!own} onChange={() => update({ use: "default" })} /><span><strong>Featured collection</strong><small>{info.featured}</small></span></label>
          </div>
          {!own && <div className="hero-collections" role="radiogroup" aria-label="Collection to feature">
            {collections.length === 0 && <p className="collection-help">No collections yet. Add one in Collections.</p>}
            {collections.map((entry) => <button key={entry.id} type="button" role="radio" aria-checked={chosen === entry.id} className={chosen === entry.id ? "is-active" : ""} onClick={() => update({ featuredId: entry.id })}>
              {entry.photos[0] ? <Image src={entry.photos[0]} alt="" width={56} height={70} unoptimized /> : <span className="hero-collection-blank" />}
              <span><strong>{entry.title}</strong><small>{entry.heroMode === "video" && entry.heroVideo ? "Launch video" : `${entry.photos.length} photo${entry.photos.length === 1 ? "" : "s"}`}{entry.id === currentFeatured ? " · featured now" : ""}</small></span>
            </button>)}
          </div>}
        </section>}

        {own && <>
          <section className="panel hero-card">
            <h2>Photos or video</h2>
            <div className="hero-segment" role="radiogroup" aria-label="Type">
              <button type="button" role="radio" aria-checked={draft.style === "photos"} className={draft.style === "photos" ? "is-active" : ""} onClick={() => setStyle("photos")}>Photos</button>
              <button type="button" role="radio" aria-checked={draft.style === "video"} className={draft.style === "video" ? "is-active" : ""} onClick={() => setStyle("video")}>Video</button>
            </div>
            <p className="collection-help">{draft.style === "video" ? "Videos play muted, one after another. Use one for a single launch film." : "One photo stays still; two or more play as a carousel."} Up to eight, in the order shown.</p>
            {draft.media.length > 0 && <ol className="hero-media">
              {draft.media.map((item, index) => <li key={`${item}-${index}`}>
                {draft.style === "video" ? <video src={src(item)} muted playsInline preload="metadata" /> : <Image src={src(item)} alt="" width={64} height={80} unoptimized />}
                <span><strong>{draft.style === "video" ? "Video" : "Photo"} {index + 1}</strong><small>{item.startsWith("site:") ? "On the site now" : item.startsWith("/uploads/") ? "Uploaded" : "Link"}</small></span>
                <div className="hero-media-actions">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${kind} ${index + 1} up`}><ChevronDown size={15} style={{ transform: "rotate(180deg)" }} /></button>
                  <button type="button" disabled={index === draft.media.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${kind} ${index + 1} down`}><ChevronDown size={15} /></button>
                  <button type="button" onClick={() => update({ media: draft.media.filter((_, at) => at !== index) })} aria-label={`Remove ${kind} ${index + 1}`}><Trash2 size={15} /></button>
                </div>
              </li>)}
            </ol>}
            <div className="hero-add">
              <label className={`hero-upload${uploading || draft.media.length >= 8 ? " is-disabled" : ""}`}><Upload size={15} /> {uploading ? "Uploading…" : `Upload ${kind}s`}
                <input type="file" accept={draft.style === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} multiple disabled={uploading || draft.media.length >= 8} onChange={upload} />
              </label>
              <div className="hero-link">
                <input type="url" inputMode="url" aria-label={`Add a ${kind} by link`} value={link} onChange={(event) => setLink(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder={draft.style === "video" ? "Or paste a link: https://…/film.mp4" : "Or paste a link: https://…/photo.jpg"} />
                <button type="button" onClick={addLink} disabled={!link.trim()}>Add</button>
              </div>
            </div>
          </section>

          <section className="panel hero-card">
            <h2>Words</h2>
            <label className="hero-field">Small line above the heading<input value={draft.eyebrow ?? ""} maxLength={60} onChange={(event) => update({ eyebrow: event.target.value })} /></label>
            <label className="hero-field">Heading<input value={draft.title ?? ""} maxLength={80} required onChange={(event) => update({ title: event.target.value })} /><small>The last word is set in italics.</small></label>
            <label className="hero-field">Short description<textarea value={draft.text ?? ""} maxLength={300} rows={3} onChange={(event) => update({ text: event.target.value })} /></label>
          </section>

          <section className="panel hero-card">
            <h2>Button</h2>
            <div className="hero-field-row">
              <label className="hero-field">Button text<input value={draft.buttonLabel ?? ""} maxLength={40} onChange={(event) => update({ buttonLabel: event.target.value })} placeholder="Empty for no button" /></label>
              <label className="hero-field">Goes to<select value={draft.buttonTo ?? ""} onChange={(event) => update({ buttonTo: event.target.value || undefined })}>
                <option value="">Choose…</option>
                <option value="rtw">RTW Store</option>
                <option value="services">Services</option>
                <option value="appointment">Book an appointment</option>
                {site === "rtw" && <option value="featured">Featured collection, further down</option>}
                {collections.length > 0 && <optgroup label="A collection">{collections.map((entry) => <option key={entry.id} value={`collection:${entry.id}`}>{entry.title}</option>)}</optgroup>}
              </select></label>
            </div>
          </section>
        </>}

        <div className={`hero-save${changed || error ? " is-floating" : ""}`}>
          {error ? <p className="collection-error" role="alert">{error}</p> : notice ? <p className="inventory-message" role="status">{notice}</p> : <p className="hero-save-hint">{changed ? "Unsaved changes" : unpublished(site) ? "Saved, not published yet" : "This is what the site shows now."}</p>}
          <div className="hero-save-actions">
            {changed && <button type="button" className="hero-text-button" onClick={() => { setDraft(saved); setError(""); }}>Undo changes</button>}
            {!changed && unpublished(site) && <button type="button" className="hero-text-button" onClick={() => { if (!window.confirm("Discard the saved changes and go back to what the site shows?")) return; const rest = { ...drafts }; delete rest[site]; storeDrafts(rest); setDraft(published); window.dispatchEvent(new Event(heroesChanged)); }}>Discard draft</button>}
            <button type="button" className="inventory-quiet-button" disabled={!changed || uploading} onClick={save}>{changed ? "Save" : "Saved"}</button>
            <button type="button" className="create-bill-button" disabled={(!changed && !unpublished(site)) || uploading} onClick={publish}>Publish</button>
          </div>
        </div>
      </div>

      <aside className="hero-preview" aria-label="Preview">
        <div className="eyebrow">PREVIEW</div>
        <div className="hero-preview-frame">
          {preview ? (draft.style === "video" ? <video key={preview} src={src(preview)} muted autoPlay loop playsInline /> : <Image src={src(preview)} alt="" fill sizes="420px" unoptimized />) : null}
          {own ? <div className="hero-preview-copy">
            {draft.eyebrow && <small>{draft.eyebrow}</small>}
            <strong>{words.slice(0, -1).join(" ")} <em>{words.at(-1)}</em></strong>
            {draft.text && <p>{draft.text}</p>}
            {draft.buttonLabel && <span className="hero-preview-button">{draft.buttonLabel} →</span>}
          </div> : chosenCollection ? <><Image src={chosenCollection.photos[0] ?? ""} alt="" fill sizes="420px" unoptimized /><div className="hero-preview-copy"><small>FEATURED COLLECTION</small><strong>{chosenCollection.title}</strong>{chosenCollection.description && <p>{chosenCollection.description}</p>}</div></> : <p className="hero-preview-empty">{info.featured}</p>}
        </div>
        {own && draft.media.length > 1 && <p className="collection-help">Shows the first {kind}; the others follow on the site.</p>}
      </aside>
    </div>
  </>;
}
