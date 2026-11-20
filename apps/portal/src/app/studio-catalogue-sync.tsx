"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { inventoryChanged, parseInventory, storageKey } from "@/lib/inventory";
import { readCollections } from "./collections-workspace";

const pendingKey = "ny-atelier-studio-catalogue-pending-v2";
const revisionKey = "ny-atelier-studio-catalogue-revision";
let publications: Promise<unknown> = Promise.resolve();
const snapshot = () => JSON.stringify({ inventory: parseInventory(localStorage.getItem(storageKey)), collections: readCollections() });
function publish() {
  const work = publications.catch(() => {}).then(async () => {
    const body = snapshot();
    const pending = localStorage.getItem(pendingKey);
    if (!pending) return;
    const revision = Number(pending);
    if (!Number.isInteger(revision) || revision < 1) throw new Error("Reload the shared catalogue before publishing this older draft.");
    const response = await fetch("/api/studio/catalogue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(body), revision }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Could not share the Studio catalogue.");
    localStorage.setItem(revisionKey, String(data.revision));
    if (snapshot() === body) localStorage.removeItem(pendingKey);
    else localStorage.setItem(pendingKey, String(data.revision));
  });
  publications = work;
  return work;
}
export default function StudioCatalogueSync() {
  const pathname = usePathname();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (pathname.startsWith("/showroom") || !["127.0.0.1", "localhost"].includes(location.hostname)) return;
    let active = true; let hydrating = false;
    const hydrate = async () => {
      try {
        await publications.catch(() => {});
        if (localStorage.getItem(pendingKey)) { await publish(); if (active) setError(""); return; }
        const response = await fetch("/api/studio/catalogue", { cache: "no-store" }); if (!response.ok) throw new Error("The shared catalogue is unavailable. Saved drafts will retry when connected.");
        const data = await response.json(); if (!active || localStorage.getItem(pendingKey)) return;
        hydrating = true;
        localStorage.setItem(storageKey, JSON.stringify(data.inventory)); localStorage.setItem("ny-atelier-collections-v1", JSON.stringify(data.collections)); localStorage.setItem(revisionKey, String(data.revision));
        window.dispatchEvent(new Event(inventoryChanged)); hydrating = false; setError("");
      } catch (failure) { hydrating = false; if (active) setError(failure instanceof Error ? failure.message : "Could not share the Studio catalogue."); }
    };
    const sync = () => {
      if (hydrating) return;
      if (!localStorage.getItem(pendingKey)) localStorage.setItem(pendingKey, localStorage.getItem(revisionKey) ?? "0");
      void publish().then(() => { if(active) setError(""); }).catch(failure => { if(active) setError(failure.message); });
    };
    const storage = (event: StorageEvent) => { if ([storageKey,"ny-atelier-collections-v1"].includes(event.key ?? "")) void hydrate(); };
    void hydrate();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void hydrate(); },15000);
    window.addEventListener("storage", storage); window.addEventListener(inventoryChanged, sync); window.addEventListener("ny-atelier-collections-changed", sync); window.addEventListener("online", hydrate); window.addEventListener("focus",hydrate);
    return () => { active = false; clearInterval(interval); window.removeEventListener("storage", storage); window.removeEventListener(inventoryChanged, sync); window.removeEventListener("ny-atelier-collections-changed", sync); window.removeEventListener("online", hydrate); window.removeEventListener("focus",hydrate); };
  }, [pathname,reload]);
  return error && !pathname.startsWith("/showroom") ? <div className="studio-catalogue-error" role="alert"><span>{error} Reloading replaces the local draft with shared stock.</span><button type="button" onClick={() => { localStorage.removeItem(pendingKey); setReload(value=>value+1); }}>Reload shared catalogue</button></div> : null;
}
