"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";
import { Download, Upload } from "@/components/icons";

const keys = ["ny-atelier-rtw-inventory-draft-v1", "ny-atelier-collections-v1", "ny-atelier-recurring-bills-draft-v1"];
type Copy = { app: string; version: number; records: [string, string | null][] };

export default function LayoutDataCopy({ comparison }: { comparison: boolean }) {
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  function download() {
    try {
      const data: Copy = { app: "ny-atelier-layout-copy", version: 1, records: keys.map(key => [key, localStorage.getItem(key)]) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "ny-atelier-layout-copy.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setComplete(true);
    } catch { setError("Could not read the saved catalogue drafts in this browser."); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      if (file.size > 12 * 1024 * 1024) throw new Error("Choose a layout copy smaller than 12 MB.");
      const data: Copy = JSON.parse(await file.text());
      if (data.app !== "ny-atelier-layout-copy" || data.version !== 1 || !Array.isArray(data.records) || data.records.length !== keys.length || data.records.some(record => !Array.isArray(record) || !keys.includes(record[0]) || record.length !== 2 || !(record[1] === null || typeof record[1] === "string")) || new Set(data.records.map(record => record[0])).size !== keys.length) throw new Error("Choose the layout copy exported from the original workspace.");
      const previous = keys.map(key => [key, localStorage.getItem(key)] as const);
      try { for (const [key, value] of data.records) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } }
      catch { for (const [key, value] of previous) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } throw new Error("There is not enough browser storage for this copy."); }
      setComplete(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not import this layout copy."); }
  }
  return <main className="workspace layout-copy-page"><section className="panel inventory-form-panel"><div className="eyebrow">LAYOUT COMPARISON / SETUP</div><h2>{comparison ? "Import catalogue drafts" : "Copy catalogue drafts"}</h2><p className="portal-form-help">{comparison ? "Import the copy from the original workspace to start both layouts with the same products, collections and recurring bills. This replaces drafts in this comparison preview only." : "Copy the products, collections and recurring bills saved in this browser. The database records are copied separately."}</p>
    {comparison ? <label className="layout-copy-upload inventory-quiet-button"><Upload size={16} /> Choose layout copy<input type="file" aria-label="Choose layout copy" accept="application/json,.json" onChange={event => void upload(event)} /></label> : <button className="create-bill-button" onClick={download}><Download size={16} /> Download layout copy</button>}
    {error && <p role="alert" className="collection-error">{error}</p>}{complete && <p className="inventory-message" role="status">{comparison ? "Catalogue drafts copied into this comparison preview." : "Layout copy downloaded. The original drafts have not been changed."}</p>}
    <div className="layout-copy-links">{!comparison && <a className="text-link" href="http://127.0.0.1:3002/layout-data-copy">Open comparison import</a>}<Link className="text-link" href="/">{comparison ? "Open top-navigation preview" : "Return to original workspace"}</Link></div>
  </section></main>;
}
