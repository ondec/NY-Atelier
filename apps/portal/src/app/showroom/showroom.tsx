"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList, History, Ruler, Search, Shirt, UserRound, Plus, ShoppingBag, X } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { emptyInventory, isLowStock, stockKnown, productTypes, variantKey, variantLabel, type Variant } from "@/lib/inventory";
import { demoStock } from "../../../../mobile/src/data/demo-stock";
import { sampleCollections, type Collection } from "../collections-workspace";
import { customerApi, CustomerEditor, useCustomerSearch, type Directory, type Profile } from "../customers-workspace";
import { customerSearchQuery } from "@/lib/customer-search";
import CreateStaffOrder from "../create-staff-order";
import StatusBadge from "../status-badge";
import SaleBasket, { type SaleLine } from "./sale-basket";
import { InventoryDrawer } from "../catalogue-editor";
import "./showroom.css";
import StudioCheckout, { readPendingCheckout } from "./checkout";
import StudioReceipt from "../studio-receipt";
import StudioSalesRegister from "../studio-sales-register";
import { can, type StaffIdentity } from "@/lib/staff-permissions";
import type { Receipt } from "@/lib/studio-sales";
import GarmentGallery from "./garment-gallery";
import CustomerOrders from "./customer-orders";
import WelcomeCarousel from "./welcome-carousel";
import StudioTools from "./studio-tools";
import FrontDeskBell from "./front-desk-bell";
import {openSavedCustomerFitting, readStudioLocation, type StudioLocation} from "@/lib/studio-location";
import {leaveStudioDialog} from "@/lib/studio-dialog-history";
import {readSaleDraft, saleDraftKey} from "@/lib/studio-sale-draft";
import { filterStudioCatalogue } from "@/lib/studio-catalogue";
import { FittingMedia } from "../fitting-fields";
import FittingReadings from "../fitting-readings";
import { selectedSizeSummary } from "../../../../mobile/src/data/size-charts";

const money = (amount: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(amount);
const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];
function salesFreeLocation(location: StudioLocation): StudioLocation {
  return location.module === "collection" ? {...location, module: "measurements", saleDesk: false, productId: undefined, editor: location.editor === "customer" ? "customer" : undefined} : location;
}
const date = (value: string) => new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Showroom({ staff, initialLocation: requestedLocation = readStudioLocation('') }: { staff: StaffIdentity; initialLocation?: StudioLocation }) {
  // Staff without the sales permission (customer records only) never open Ready-to-Wear, even from a typed URL or Back.
  const canSell = can(staff, "sales");
  const canReadOrders = can(staff, "orders.read");
  const canCreateOrders = can(staff, "orders.manage");
  const initialLocation = canSell ? requestedLocation : salesFreeLocation(requestedLocation);
  const [module, setModule] = useState<"welcome" | "collection" | "measurements">(initialLocation.module);
  const [inventory, setInventory] = useState(emptyInventory);
  const [catalogueError, setCatalogueError] = useState("");
  const [collections, setCollections] = useState<Collection[]>(sampleCollections);
  const [collectionId, setCollectionId] = useState("all");
  const [productId, setProductId] = useState(initialLocation.productId ?? "shop-redclover-navy");
  const [edition, setEdition] = useState("");
  const [size, setSize] = useState("");
  const [directory, setDirectory] = useState<Directory>();
  const [profile, setProfile] = useState<Profile>();
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerId, setCustomerId] = useState<number | undefined>(initialLocation.customerId);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<"customer" | "fitting" | undefined>(initialLocation.editor);
  const [historyId, setHistoryId] = useState<number>();
  const [viewingProduct, setViewingProduct] = useState(Boolean(initialLocation.productId));
  const [productQuery, setProductQuery] = useState("");
  const [clothingType, setClothingType] = useState("all");
  const [availableSize, setAvailableSize] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [checkout, setCheckout] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>();
  const [salesHistory, setSalesHistory] = useState(false);
  const [sale, setSale] = useState<SaleLine[]>([]);
  const [saleDesk, setSaleDesk] = useState(initialLocation.saleDesk);
  const [draftReady, setDraftReady] = useState<number>();
  const saleCount = sale.reduce((count, line) => count + line.quantity, 0);
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [saleNotice, setSaleNotice] = useState("");
  const [templateId, setTemplateId] = useState<string>(initialLocation.templateId ?? "kaftan");
  const [fittingPage, setFittingPage] = useState<'customers' | 'profile'>(initialLocation.customerId ? 'profile' : 'customers');
  const [profileTab, setProfileTab] = useState<'fittings' | 'orders'>('fittings');
  const [orderRevision, setOrderRevision] = useState(0);
  const [orderNotice, setOrderNotice] = useState('');
  const [orderFromFitting, setOrderFromFitting] = useState<{ customerId: number; fittingId: number }>();
  const fittingRecordRef = useRef<HTMLElement>(null);
  const fittingSearchRef = useRef<HTMLInputElement>(null);
  const pendingFittingFocus = useRef(false);
  const fittingBusy = useRef(false);

  useEffect(() => {
    function readFittingLocation() {
      if (fittingBusy.current) {window.history.forward(); return;}
      const location = canSell ? readStudioLocation(window.location.search) : salesFreeLocation(readStudioLocation(window.location.search));
      if (!canSell && new URLSearchParams(window.location.search).get('view') === 'collection') {
        const url = new URL(window.location.href); url.searchParams.set('view', 'fittings'); url.searchParams.delete('product'); url.searchParams.delete('screen');
        window.history.replaceState(null, '', url);
      }
      setModule(location.module); setEditor(location.editor); setSaleDesk(location.saleDesk);
      setViewingProduct(Boolean(location.productId));
      if (location.productId) setProductId(location.productId);
      if (location.templateId) setTemplateId(location.templateId);
      if (location.customerId) {
        setCustomerId(location.customerId); setFittingPage('profile'); pendingFittingFocus.current = true;
      } else {setFittingPage('customers'); fittingSearchRef.current?.focus({preventScroll: true});}
    }
    readFittingLocation();
    window.addEventListener('popstate', readFittingLocation);
    return () => window.removeEventListener('popstate', readFittingLocation);
  }, [canSell]);

  useEffect(() => {
    if (fittingPage === 'profile' && profile?.customer.id === customerId) {
      fittingRecordRef.current?.scrollTo({top: 0});
      if (pendingFittingFocus.current && window.matchMedia('(max-width: 760px)').matches) {
        fittingRecordRef.current?.focus({preventScroll: true});
      }
      pendingFittingFocus.current = false;
    }
  }, [customerId, profile, fittingPage]);

  function changeStudioModule(next: 'welcome' | 'collection') {
    setModule(next); setSaleDesk(false);
    const url = new URL(window.location.href);
    if (next === 'collection') url.searchParams.set('view', 'collection'); else url.searchParams.delete('view');
    url.searchParams.delete('customer'); url.searchParams.delete('screen'); url.searchParams.delete('garment'); url.searchParams.delete('product');
    setViewingProduct(false);
    if (url.href !== window.location.href) window.history.pushState({studioModule: true}, '', url);
  }

  function openSaleDesk() {
    if (!saleCount) return;
    setModule('collection'); setSaleDesk(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'collection'); url.searchParams.set('screen', 'sale');
    url.searchParams.delete('customer'); url.searchParams.delete('garment');
    if (url.href !== window.location.href) window.history.pushState({studioSaleDesk: true}, '', url);
  }

  function closeSaleDesk() {
    setSaleDesk(false);
    if (window.history.state?.studioSaleDesk) {window.history.back(); return;}
    const url = new URL(window.location.href);
    url.searchParams.delete('screen');
    window.history.replaceState(null, '', url);
  }

  function openFittingCustomer(id: number) {
    setProfileTab('fittings'); setOrderNotice('');
    setModule('measurements'); setFittingPage('profile'); setSaleDesk(false);
    if (id !== customerId) {setCustomerId(id); setProfile(undefined);}
    setError(''); pendingFittingFocus.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== 'fittings') {
      url.searchParams.set('view', 'fittings'); url.searchParams.delete('customer');
      url.searchParams.delete('product'); url.searchParams.delete('screen'); url.searchParams.delete('garment');
      setViewingProduct(false);
      window.history.pushState({studioModule: true}, '', url);
    }
    if (url.searchParams.get('customer') !== String(id)) {
      url.searchParams.set('customer', String(id));
      window.history.pushState({studioFittingProfile: true}, '', url);
    }
  }

  function customOrderCreated(reference: string) {
    setOrderNotice(`Custom order ${reference} created.`); setOrderRevision(value => value + 1); setProfileTab('orders');
  }

  function showFittingCustomers() {
    setModule('measurements'); setFittingPage('customers'); setSaleDesk(false);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'fittings'); url.searchParams.delete('customer'); url.searchParams.delete('screen'); url.searchParams.delete('garment'); url.searchParams.delete('product');
    setViewingProduct(false);
    if (url.href !== window.location.href) window.history.pushState({studioModule: true}, '', url);
    requestAnimationFrame(() => fittingSearchRef.current?.focus({preventScroll: true}));
  }

  function openFittingEditor(mode: 'customer' | 'fitting') {
    const url = new URL(window.location.href);
    url.searchParams.set('view', module === 'measurements' ? 'fittings' : 'collection');
    url.searchParams.set('screen', mode === 'customer' ? 'new-customer' : 'fitting');
    if (mode === 'fitting' && customerId) {
      url.searchParams.set('customer', String(customerId)); url.searchParams.set('garment', templateId);
    }
    if (url.href !== window.location.href) window.history.pushState({studioForm: true}, '', url);
    setEditor(mode);
  }

  function returnFittingCustomers() {
    if (window.history.state?.studioFittingProfile) {window.history.back(); return;}
    setFittingPage('customers');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'fittings'); url.searchParams.delete('customer');
    window.history.replaceState(null, '', url);
    requestAnimationFrame(() => fittingSearchRef.current?.focus({preventScroll: true}));
  }

  function closeFittingEditor() {
    if (fittingBusy.current) return;
    setEditor(undefined);
    if (window.history.state?.studioForm) {window.history.back(); return;}
    const url = new URL(window.location.href);
    url.searchParams.delete('screen'); url.searchParams.delete('garment');
    window.history.replaceState(null, '', url);
  }

  function finishFittingEditor(id: number) {
    fittingBusy.current = false;
    if (window.history.state?.studioForm) {
      setEditor(undefined); setCustomerId(id); setRevision(value => value + 1); setError('');
      if (module === 'measurements') {
        const returned = () => {window.removeEventListener('popstate', returned); queueMicrotask(() => openFittingCustomer(id));};
        window.addEventListener('popstate', returned);
      }
      window.history.back(); return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('screen'); url.searchParams.delete('garment');
    if (module === 'measurements') {url.searchParams.set('view', 'fittings'); url.searchParams.set('customer', String(id));}
    window.history.replaceState(null, '', url);
    setEditor(undefined);
    if (module === 'measurements') openFittingCustomer(id); else setCustomerId(id);
    setRevision(value => value + 1); setError('');
  }

  function saveCustomerAndMeasure(id: number) {
    fittingBusy.current = false;
    openSavedCustomerFitting(window, id, templateId);
    setModule('measurements'); setFittingPage('profile'); setSaleDesk(false); setViewingProduct(false);
    setProfile(undefined); setCustomerId(id); setHistoryId(undefined);
    setRevision(value => value + 1); setError(''); setEditor('fitting');
  }

  useEffect(() => {
    let active = true;
    if (!canSell) return;
    queueMicrotask(() => {
      if (!active) return;
      const saved = readPendingCheckout(staff.id);
      if (saved) {setSale(saved.lines); setCustomerId(saved.customer_id); setModule("collection"); setCheckout(true);}
      else {try {const draft = readSaleDraft(sessionStorage.getItem(saleDraftKey(staff.id))); if (draft) {setSale(draft.lines); if (!initialLocation.customerId) setCustomerId(draft.customerId);}} catch {/* The Studio remains usable when browser storage is disabled. */}}
      setDraftReady(staff.id);
    });
    return () => { active = false; };
  }, [staff.id, initialLocation.customerId, canSell]);

  useEffect(() => {
    if (draftReady !== staff.id) return;
    try {
      if (sale.length) sessionStorage.setItem(saleDraftKey(staff.id), JSON.stringify({lines: sale, customerId, updatedAt: Date.now()}));
      else sessionStorage.removeItem(saleDraftKey(staff.id));
    } catch {/* Saving a sale remains available without browser storage. */}
  }, [sale, customerId, staff.id, draftReady]);

  useEffect(() => {
    if (!canSell) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/studio/catalogue", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { location.reload(); return; }
        if (!response.ok) throw new Error("The shared catalogue is unavailable. Check your connection.");
        const data = await response.json(); if (!controller.signal.aborted) { setInventory(data.inventory); setCollections(data.collections); setCatalogueError(""); }
      } catch (failure) { if (!controller.signal.aborted) setCatalogueError(failure instanceof Error ? failure.message : "Check your connection."); }
    }
    void refresh(); const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 8000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [canSell]);

  useEffect(() => {
    const controller = new AbortController();
    customerApi<Directory>(customerSearchQuery("", 1, 1), { signal: controller.signal }).then(setDirectory).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    if (customerId) customerApi<Profile>(`?id=${customerId}`, { signal: controller.signal }).then((value) => {
      if (controller.signal.aborted) return;
      setProfile(value);
      setHistoryId(undefined);
      setError("");
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [customerId, revision]);

  useEffect(() => {
    if (!saleNotice) return;
    const timeout = window.setTimeout(() => setSaleNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [saleNotice]);

  const collection = collections.find((item) => item.id === collectionId);
  const product = inventory.products.find((item) => item.id === productId);
  const catalogue = filterStudioCatalogue(inventory, collection?.productIds, { query: productQuery, clothingType, size: availableSize, availability });
  const filtersActive = Boolean(productQuery || clothingType !== "all" || collectionId !== "all" || availableSize !== "all" || availability !== "all");
  function clearProductFilters() { setProductQuery(""); setClothingType("all"); setCollectionId("all"); setAvailableSize("all"); setAvailability("all"); }
  const variants = inventory.variants.filter((item) => item.productId === product?.id);
  const editions = [...new Map(variants.map((item) => [variantKey(item), item])).values()];
  const selected = editions.find((item) => variantKey(item) === edition) ?? editions[0];
  const stock = selected ? variants.filter((item) => variantKey(item) === variantKey(selected)).sort((a, b) => sizes.indexOf(a.size) - sizes.indexOf(b.size)) : [];
  const visual = selected && inventory.visuals?.[variantKey(selected)];
  const gallery = visual?.gallery?.length ? visual.gallery : product?.gallery?.length ? product.gallery : product?.photo ? [product.photo] : [];
  const selectedStock = stock.find((item) => item.size === size);
  const template = directory?.templates?.[templateId];
  const fitting = profile?.measurements.find((item) => item.id === historyId) ?? profile?.measurements[0];
  const customerSearch = useCustomerSearch(customerQuery, { perPage: 30, revision });
  const customers = customerSearch.customers;
  const moreCustomers = customerSearch.hasMore && <button className="showroom-secondary showroom-more-customers" type="button" disabled={customerSearch.loadingMore} onClick={customerSearch.loadMore}>{customerSearch.loadingMore ? "Loading…" : `Show more (${(customerSearch.total - customers.length).toLocaleString()} left)`}</button>;
  const profileReady = profile && profile.customer.id === customerId;

  function chooseProduct(id: string) {
    setViewingProduct(true);
    setProductId(id);
    setEdition("");
    setSize("");
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'collection'); url.searchParams.set('product', id);
    if (url.href !== window.location.href) window.history.pushState({studioProduct: true}, '', url);
  }

  function backToGarments() {
    if (window.history.state?.studioProduct) {window.history.back(); return;}
    setViewingProduct(false);
    const url = new URL(window.location.href); url.searchParams.delete('product');
    window.history.replaceState(null, '', url);
  }

  function updateAlteration(variantId: string, alteration: string | undefined) {
    setSale((current) => current.map((item) => {
      if (item.variantId !== variantId) return item;
      const line = { variantId: item.variantId, quantity: item.quantity };
      return alteration === undefined ? line : { ...line, alteration };
    }));
  }

  function updateSale(variantId: string, quantity: number) {
    const row = inventory.variants.find((item) => item.id === variantId);
    if (quantity > 0 && (!row || !stockKnown(row) || quantity > row.quantity)) return;
    setSale((current) => quantity <= 0 ? current.filter((item) => item.variantId !== variantId)
      : current.map((item) => item.variantId === variantId ? { ...item, quantity } : item));
  }

  function addToSale() {
    if (!selectedStock || !stockKnown(selectedStock) || !product || selectedStock.quantity <= 0) return;
    setSale((current) => {
      const existing = current.find((line) => line.variantId === selectedStock.id);
      if ((existing?.quantity ?? 0) >= selectedStock.quantity) return current;
      return existing ? current.map((line) => line.variantId === selectedStock.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { variantId: selectedStock.id, quantity: 1 }];
    });
    setSaleNotice(`${product.name} · ${size} added to the sale.`);
  }

  function swatch(row: Variant) {
    const swatchProduct = inventory.products.find((item) => item.id === row.productId);
    return inventory.visuals?.[variantKey(row)]?.swatch ?? demoStock[(swatchProduct?.catalogueId ?? swatchProduct?.id ?? "").replace(/^shop-/, "")]?.find((item) => item.colour === row.colour && item.fabric === row.fabric)?.swatch ?? "#7A8B7B";
  }

  if (module === "welcome") return <main className="showroom showroom-welcome">
    <WelcomeCarousel />
    <StudioTools staff={staff} welcome />
    <div className="showroom-welcome-content">
      <p className="showroom-kicker">WELCOME TO NY STUDIO</p>
      <h1>Made for<br />your world.</h1>
      <p className="showroom-welcome-intro">A personal experience.<br />From the first fitting to the final detail.</p>
      <nav className="showroom-welcome-modules" aria-label="NY Studio modules">
        <button onClick={showFittingCustomers}>
          <span className="showroom-welcome-icon"><Ruler size={23} /></span>
          <span><small>01 / THE PERSONAL FIT</small><strong>Fittings</strong><span>Customer measurements & fitting history</span></span>
          <ArrowRight size={20} />
        </button>
        {canSell && <button onClick={() => { changeStudioModule("collection"); setViewingProduct(false); }}>
          <span className="showroom-welcome-icon"><Shirt size={23} /></span>
          <span><small>02 / THE COLLECTION</small><strong>Ready-to-Wear</strong><span>Explore garments, colours & available sizes</span></span>
          <ArrowRight size={20} />
        </button>}

      </nav>
    </div>
    <div className="showroom-welcome-brand"><Image src="/ny-mark.svg" alt="" width={49} height={49} /><div><strong>NY ATELIER</strong><span>MADE WITH INTENTION</span></div></div>
  </main>;

  return <main className={`showroom${module === "measurements" ? " is-fitting" : ""}`}>
    <div className="showroom-main">
      {catalogueError && <p className="collection-error" role="alert">{catalogueError}</p>}
      <header className="showroom-header">
        <div className="showroom-module-navigation">
          <button className="showroom-home-button showroom-header-brand" aria-label="Return to NY Studio" onClick={() => changeStudioModule("welcome")}><ArrowLeft size={16} /><Image src="/ny-mark.svg" alt="" width={34} height={34} /><span><strong>NY ATELIER</strong><small>NY Studio</small></span></button>
          <div className={`studio-module-dock${saleCount ? ' has-sale' : ''}`}>
            <nav aria-label="NY Studio modules"><button aria-pressed={module === "measurements"} onClick={showFittingCustomers}>Fittings</button>{canSell && <button aria-pressed={module === "collection"} onClick={() => { changeStudioModule("collection"); setViewingProduct(false); }}>Ready-to-Wear</button>}</nav>
            {saleCount > 0 && <button type="button" className="studio-sale-trigger" aria-label={`Open Sales Desk, ${saleCount} ${saleCount === 1 ? 'item' : 'items'}`} aria-haspopup="dialog" onClick={openSaleDesk}><ShoppingBag size={23}/><span className="studio-sale-badge" aria-hidden="true">{saleCount > 99 ? '99+' : saleCount}</span></button>}
          </div>
        </div>
        <div className="showroom-header-actions">{can(staff, "orders.read") && <FrontDeskBell onOpen={(id) => { openFittingCustomer(id); setProfileTab('orders'); }} />}<StudioTools staff={staff} onSalesHistory={canSell ? ()=>setSalesHistory(true) : undefined}/></div>
      </header>
      {module === "collection" && canSell ? <>
        <div className="showroom-intro"><div>{viewingProduct && <button type="button" className="showroom-home-button" onClick={backToGarments}><ArrowLeft size={18} />Back to garments</button>}<h1>Ready-to-Wear</h1></div></div>
        {saleNotice && <p className="showroom-sale-notice" role="status">{saleNotice}</p>}
        <div className="showroom-pos-layout"><div className="showroom-pos-catalogue" key={viewingProduct ? productId : 'catalogue'}>
        {viewingProduct && product ? <>
        <div className="showroom-stage showroom-pos-detail">
          <GarmentGallery key={`${product.id}-${selected ? variantKey(selected) : "default"}`} photos={gallery} label={`${product.name} · ${selected ? variantLabel(selected) : "Garment"}`} />
          <section className="showroom-spec">
            <p className="showroom-kicker">01 / CHOOSE YOUR PIECE</p><h2>{product.name}</h2><p className="showroom-price">{money(product.price)}<span>{product.type}</span></p>
            {product.description && <p className="showroom-hint">{product.description}</p>}
            {!visual?.gallery?.length && selected && selected !== editions[0] && <p className="showroom-hint">Garment reference image. A photo of this colour or fabric has not been added yet.</p>}
            <div className="showroom-step"><p className="showroom-kicker">02 / COLOUR & FABRIC</p><h3>{selected ? variantLabel(selected) : "No variants added"}</h3>
              <div className="showroom-swatches">{editions.map((row) => {
                const fabric = inventory.visuals?.[variantKey(row)]?.photo;
                return <button key={variantKey(row)} aria-label={variantLabel(row)} aria-pressed={selected && variantKey(selected) === variantKey(row)} onClick={() => { setEdition(variantKey(row)); setSize(""); }} style={{ backgroundColor: swatch(row) }}>{fabric && <Image src={fabric} alt="" fill sizes="48px" unoptimized />}{selected && variantKey(selected) === variantKey(row) && <Check size={17} />}</button>;
              })}</div>
            </div>
            <div className="showroom-step"><p className="showroom-kicker">03 / FIND THE FIT</p><div className="showroom-sizes">{stock.map((row) => <button key={row.id} disabled={row.quantity <= 0 || !stockKnown(row)} aria-pressed={size === row.size} onClick={() => setSize(row.size)}>{row.size}</button>)}</div>
              {size && <p className="studio-size-measurements" aria-live="polite">{selectedSizeSummary(product.catalogueId ?? product.id, product.type, size, undefined, "in")}</p>}
              <p className="showroom-availability">{selectedStock && <><StatusBadge status={!stockKnown(selectedStock) ? "Not counted" : selectedStock.quantity === 0 ? "Out of stock" : isLowStock(selectedStock) ? "Low stock" : "In stock"} /> </>}{selectedStock ? stockKnown(selectedStock) ? `${selectedStock.quantity} available in ${selectedStock.size}` : "Enter a stock count in NY Office before selling this size." : stock.some(row => !stockKnown(row)) ? "Stock has not been counted. Enter counts in NY Office before selling these sizes." : stock.length ? "Choose an available size to check stock." : "Stock has not been set up for this piece."}</p>
            </div>
            <button className="showroom-primary showroom-add-sale" disabled={!selectedStock || !stockKnown(selectedStock) || selectedStock.quantity <= (sale.find((line) => line.variantId === selectedStock.id)?.quantity ?? 0)} onClick={addToSale}><ShoppingBag size={19} />{!size ? "Choose a size to add" : "Add to sale"}<Plus size={18} /></button>
            <button className="showroom-secondary" onClick={() => customerId ? openFittingCustomer(customerId) : showFittingCustomers()}><Ruler size={19} /> Measurements & fit notes<ArrowRight size={18} /></button>
            <p className="showroom-hint">Review a previous fitting or record measurements with your customer.</p>
          </section>
        </div></> : <>
          <div className="studio-catalogue-filters">
            <label className="showroom-search"><Search size={19} /><input type="search" aria-label="Search garments" placeholder="Search garments, colour, fabric or SKU" value={productQuery} onChange={event => setProductQuery(event.target.value)} /></label>
            <div className="studio-filter-controls">
              <label>Clothing type<select aria-label="Clothing type" value={clothingType} onChange={event => setClothingType(event.target.value)}><option value="all">All clothing</option>{productTypes.map(type => <option key={type}>{type}</option>)}</select></label>
              <label>Collection<select aria-label="Filter by collection" value={collectionId} onChange={event => setCollectionId(event.target.value)}><option value="all">All collections</option>{collections.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              <label>Size<select aria-label="Filter by size" value={availableSize} onChange={event => setAvailableSize(event.target.value)}><option value="all">All sizes</option>{[...new Set([...sizes, ...inventory.variants.map(row => row.size)])].map(size => <option key={size}>{size}</option>)}</select></label>
              <label>Stock<select aria-label="Filter by stock" value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All stock</option><option value="not-counted">Not counted</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-of-stock">Out of stock</option></select></label>
              {filtersActive && <button type="button" className="showroom-secondary" onClick={clearProductFilters}>Clear filters</button>}
            </div>
          </div>
          <div className="showroom-product-heading"><h3>{collection?.title ?? "Browse the garments"}</h3><span>{catalogue.length} {catalogue.length === 1 ? "garment" : "garments"}</span></div>
          <div className="showroom-pos-grid">{catalogue.map((item) => {
            const itemVariants = inventory.variants.filter((row) => row.productId === item.id);
            const colourVariants = [...new Map(itemVariants.map((row) => [variantKey(row), row])).values()];
            const onHand = itemVariants.filter(stockKnown).reduce((sum, row) => sum + row.quantity, 0);
            const notCounted = itemVariants.some(row => !stockKnown(row)) || (!itemVariants.length && Boolean(item.wordpressId));
            return <button key={item.id} className="showroom-pos-card" onClick={() => chooseProduct(item.id)} aria-label={`View ${item.name}`}>
              <div className="showroom-pos-card-photo">{item.photo ? <Image src={item.photo} alt="" fill sizes="(max-width: 700px) 45vw, 24vw" unoptimized style={{objectFit:"cover",objectPosition:"center top"}} /> : <Shirt size={45} />}<span className={onHand ? "showroom-stock-badge" : "showroom-stock-badge is-empty"}><StatusBadge status={onHand ? "In stock" : notCounted ? "Not counted" : "Out of stock"} /></span></div>
              <div className="showroom-pos-card-copy"><small>{item.type}</small><strong>{item.name}</strong><div><span>{money(item.price)}</span><Plus size={18} /></div><span className="showroom-card-swatches">{colourVariants.slice(0, 4).map((row) => <i key={variantKey(row)} title={variantLabel(row)} style={{backgroundColor:swatch(row)}} />)}<small>{colourVariants.length} {colourVariants.length === 1 ? "option" : "options"}</small></span></div>
            </button>;
          })}</div>
          {!catalogue.length && <div className="showroom-empty"><Search size={32} /><h3>No matching garments</h3><p>Try another name, colour or clothing type.</p><button className="showroom-secondary" onClick={clearProductFilters}>Clear filters</button></div>}
        </>}
        </div><div className="showroom-desktop-sale"><SaleBasket inventory={inventory} lines={sale} customer={profileReady ? profile.customer.name : undefined} customerId={profileReady ? profile.customer.id : undefined} onCheckout={() => setCheckout(true)} onCustomer={() => setPickingCustomer(true)} onQuantity={updateSale} onAlteration={updateAlteration} /></div></div>
      </> : <>
        <div className="showroom-intro showroom-fitting-intro"><div><h1>A fit of your own.</h1></div><button className="showroom-secondary" onClick={() => openFittingEditor("customer")}><Plus size={18} /> New customer</button></div>
        <div className={`showroom-fitting-layout is-${fittingPage}`}>
          <section className="showroom-directory" aria-label="Customer directory"><h2>Who are we fitting?</h2><label className="showroom-search"><Search size={19} /><input ref={fittingSearchRef} type="search" aria-label="Find a customer" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Name, email or phone" /></label>
            <div className="showroom-customer-list">
            {error && !profileReady && <p className="collection-error" role="alert">{error} <button className="showroom-secondary" onClick={() => {setError(""); setRevision(revision + 1);}}>Retry</button></p>}
            {(!directory || customerSearch.searching) && !error && <p role="status">{directory ? "Searching customers…" : "Loading customers…"}</p>}
            {customerSearch.error && <p className="collection-error" role="alert">{customerSearch.error}</p>}
            {directory && !customerSearch.searching && !customers.length && <p>No customers match your search.</p>}
            {customers.map((customer) => <button key={customer.id} className="showroom-person" aria-pressed={customer.id === customerId} onClick={() => openFittingCustomer(customer.id)}><span className="showroom-initial">{customer.name.slice(0, 1)}</span><span><strong>{customer.name}</strong><small>{customer.phone ?? customer.email ?? "Customer"}</small></span><ChevronRight size={17} /></button>)}
            {moreCustomers}
            </div>
          </section>
          <section ref={fittingRecordRef} className="showroom-record" tabIndex={0} aria-label="Customer fitting profile">
            <button type="button" className="showroom-home-button showroom-customers-back" onClick={returnFittingCustomers}><ArrowLeft size={18}/>Back to customers</button>
            {error && <p className="collection-error" role="alert">{error} <button className="showroom-secondary" onClick={() => { setError(""); setRevision(revision + 1); }}>Retry</button></p>}
            {profileReady ? <>
              <div className="showroom-record-heading"><div><p className="showroom-kicker">CUSTOMER PROFILE</p><h2>{profile.customer.name}</h2><p>{profile.customer.email ?? profile.customer.phone}</p></div></div>
              {canReadOrders && <div className="showroom-profile-tabs" role="tablist" aria-label="Customer profile sections"><button type="button" role="tab" aria-selected={profileTab === "fittings"} onClick={() => setProfileTab("fittings")}><Ruler size={17} />Fittings</button><button type="button" role="tab" aria-selected={profileTab === "orders"} onClick={() => setProfileTab("orders")}><ClipboardList size={17} />Orders</button></div>}
              {profileTab === "orders" && canReadOrders ? <>{orderNotice && <p className="inventory-message" role="status">{orderNotice}</p>}<CustomerOrders customerId={profile.customer.id} customerName={profile.customer.name} fittingId={profile.measurements[0]?.id} canCreate={canCreateOrders} revision={orderRevision} onCreated={customOrderCreated} /></> : <>
              {directory?.templates && <section className="showroom-template-section" aria-label="Garment measurement template">
                <div className="showroom-template-controls">
                  <label htmlFor="showroom-garment-type">What are we making?
                    <select id="showroom-garment-type" value={templateId} aria-describedby="showroom-template-info" onChange={(event) => setTemplateId(event.target.value)}>
                      {Object.entries(directory.templates).map(([id, item]) => <option value={id} key={id}>{item.name}</option>)}
                    </select>
                  </label>
                  {template && <button className="showroom-primary" onClick={() => openFittingEditor("fitting")}><Plus size={18} /> Start fitting<ArrowRight size={16} /></button>}
                </div>
                {template && <p className="showroom-template-info" id="showroom-template-info">{template.groups.map((group) => group.title).join(" · ")}<span>{template.groups.reduce((count, group) => count + group.fields.length, 0)} measurements · in</span></p>}
              </section>}
              <div className="showroom-history"><History size={18} /><label>Fitting record<select aria-label="Choose fitting record" value={fitting?.id ?? ""} onChange={(event) => setHistoryId(Number(event.target.value))}>{!profile.measurements.length && <option>No fittings recorded</option>}{profile.measurements.map((item, index) => <option key={item.id} value={item.id}>{item.garment_type ? `${directory?.templates?.[item.garment_type]?.name ?? item.garment_type} · ` : "General measurements · "}{date(item.measured_on)}{index === 0 ? " · Current" : " · Previous"}</option>)}</select></label></div>
              {fitting ? <><h3 className="showroom-fitting-name">{fitting.garment_type ? directory?.templates?.[fitting.garment_type]?.name ?? fitting.garment_type : "General measurements"}</h3><FittingReadings fitting={fitting} fields={directory?.fields ?? {}} template={fitting.garment_type ? directory?.templates?.[fitting.garment_type] : undefined} unit="in"/><FittingMedia customerId={profile.customer.id} fittingId={fitting.id} attachments={fitting.attachments ?? []}/>{fitting.notes && <div className="showroom-notes"><h3>Fitting notes</h3><p>{fitting.notes}</p></div>}{canCreateOrders && <div className="showroom-fitting-order"><div><h3>Ready to make it?</h3><p>Create a custom order with this fitting linked.</p></div><CreateStaffOrder category="Custom" preferredCustomerId={profile.customer.id} preferredMeasurementId={fitting.id} buttonClassName="showroom-primary" buttonLabel="Create order" onCreated={customOrderCreated} /></div>}</> : <div className="showroom-empty"><Ruler size={44} /><h3>The first fitting starts here.</h3><p>Record measurements and fit preferences for this customer. Each saved fitting keeps its own date and history.</p></div>}
              </>}
            </> : <div className="showroom-empty"><UserRound size={48} /><h2>{customerId && !error ? "Opening customer…" : "Every detail begins with you."}</h2><p>Select a customer to see measurements, review previous fittings, or start a new fitting.</p></div>}
          </section>
        </div>
      </>}
    </div>
    {canSell && saleDesk && <InventoryDrawer fullScreen label="Sales Desk" onClose={closeSaleDesk}><section className="inventory-form-panel studio-sale-screen"><header className="inventory-form-title"><button type="button" className="fitting-screen-back" aria-label="Back from Sales Desk" onClick={closeSaleDesk}><ArrowLeft size={20}/></button><h2>Sales Desk</h2></header><SaleBasket inventory={inventory} lines={sale} customer={profileReady ? profile.customer.name : undefined} customerId={profileReady ? profile.customer.id : undefined} onCheckout={() => setCheckout(true)} onCustomer={() => setPickingCustomer(true)} onQuantity={updateSale} onAlteration={updateAlteration}/></section></InventoryDrawer>}
    {canSell && checkout && <StudioCheckout staffId={staff.id} lines={sale} customerId={customerId ?? 0} customer={profileReady ? profile.customer.name : undefined} onClose={() => setCheckout(false)} onComplete={value => {
      setReceipt(value); setCheckout(false); setSale([]); setSize(""); setSaleDesk(false);
      if (new URLSearchParams(window.location.search).get('screen') === 'sale') {const url = new URL(window.location.href); url.searchParams.delete('screen'); window.history.replaceState(null, '', url);}
      void fetch("/api/studio/catalogue", { cache: "no-store" }).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { setInventory(data.inventory); setCatalogueError(""); }).catch(() => setCatalogueError("Sale saved. Stock will refresh when the connection returns."));
    }} />}
    {receipt && <InventoryDrawer label="Sale receipt" onClose={() => setReceipt(undefined)}><button className="studio-receipt-close" aria-label="Close receipt" onClick={() => setReceipt(undefined)}><X size={20}/></button><StudioReceipt receipt={receipt} onNewSale={() => { setReceipt(undefined); setViewingProduct(false); }} /></InventoryDrawer>}
    {canSell && salesHistory && <InventoryDrawer label="Sales history" onClose={() => setSalesHistory(false)}><section className="inventory-form-panel"><div className="inventory-form-title"><h2>Sales history</h2><button aria-label="Close sales history" onClick={() => setSalesHistory(false)}><X size={20}/></button></div><StudioSalesRegister onOpen={value => { setSalesHistory(false); setReceipt(value); }} /></section></InventoryDrawer>}
    {canSell && pickingCustomer && <InventoryDrawer label="Select customer for sale" onClose={() => setPickingCustomer(false)}>
      <section className="inventory-form-panel"><div className="inventory-form-title"><h2>Select customer</h2><button aria-label="Close customer selection" onClick={() => setPickingCustomer(false)}><X size={20} /></button></div>
        <label className="showroom-search"><Search size={18} /><input aria-label="Search sale customers" placeholder="Name, phone or email" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} /></label>
        <button className="showroom-secondary" onClick={() => leaveStudioDialog(window, () => openFittingEditor("customer"))} disabled={!directory}><Plus size={17}/>New customer</button>
        {error && <p role="alert">{error}</p>}{!directory && !error && <p role="status">Loading customers…</p>}
        {customers.map((customer) => <button key={customer.id} className="showroom-person" onClick={() => { setCustomerId(customer.id); setProfile(undefined); setPickingCustomer(false); }}><UserRound size={20} /><span><strong>{customer.name}</strong><small>{customer.phone ?? customer.email}</small></span><ChevronRight size={18} /></button>)}
        {moreCustomers}
        {customerSearch.searching && <p role="status">Searching customers…</p>}
        {customerSearch.error && <p role="alert">{customerSearch.error}</p>}
        {directory && !customerSearch.searching && !customers.length && <p>No customers match your search.</p>}
      </section>
    </InventoryDrawer>}
    {editor && directory && (editor === "customer" || profileReady) && <CustomerEditor fullScreen unit="in" mode={editor} profile={editor === "fitting" ? profile : undefined} fields={directory.fields} pieceOptions={directory.pieces} templateId={editor === "fitting" ? templateId : undefined} template={editor === "fitting" ? template : undefined} onBusyChange={busy => {fittingBusy.current = busy;}} onClose={closeFittingEditor} onSaved={finishFittingEditor} onSaveAndMeasure={saveCustomerAndMeasure} onSaveAndOrder={canCreateOrders ? (savedCustomerId, fittingId) => { finishFittingEditor(savedCustomerId); setOrderFromFitting({ customerId: savedCustomerId, fittingId }); } : undefined} />}
    {orderFromFitting && <CreateStaffOrder key={orderFromFitting.fittingId} category="Custom" startOpen preferredCustomerId={orderFromFitting.customerId} preferredMeasurementId={orderFromFitting.fittingId} onCreated={customOrderCreated} onClosed={() => setOrderFromFitting(undefined)} />}
  </main>;
}
