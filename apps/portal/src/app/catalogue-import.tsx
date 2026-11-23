"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { PackagePlus, X } from "@/components/icons";

type Summary = { added_products: number; added_sizes: number; added_photo_sets: number; kept_products: string[]; skipped_sizes: number };
type Stage =
  | { step: "idle" }
  | { step: "checking" }
  | { step: "preview"; transfer: unknown; revision: number; summary: Summary; fileName: string }
  | { step: "applying" }
  | { step: "done"; summary: Summary; backup: number }
  | { step: "undoing"; summary: Summary; backup: number }
  | { step: "undone" };

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? "The import could not be completed. Try again.");
  return data;
}

/** Pulls the updated shared catalogue into this tab (StudioCatalogueSync refreshes on focus). */
const refreshCatalogue = () => window.dispatchEvent(new Event("focus"));

/** Owner-only: add products from a WordPress transfer file to the shared catalogue. Nothing already here is changed. */
export default function CatalogueImport() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ step: "idle" });
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function close() { setOpen(false); setStage({ step: "idle" }); setError(""); }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) { setError("This file is too large to be an import file."); return; }
    setStage({ step: "checking" });
    try {
      let transfer: unknown;
      try { transfer = JSON.parse(await file.text()); } catch { throw new Error("This is not an import file. Choose the catalogue-transfer .json file."); }
      const data = await post("/api/studio/catalogue/transfer", { transfer, apply: false });
      setStage({ step: "preview", transfer, revision: data.revision, summary: data.summary, fileName: file.name });
    } catch (failure) { setStage({ step: "idle" }); setError(failure instanceof Error ? failure.message : "Could not read this file."); }
  }

  async function apply() {
    if (stage.step !== "preview") return;
    const { transfer, revision } = stage;
    setStage({ step: "applying" }); setError("");
    try {
      const data = await post("/api/studio/catalogue/transfer", { transfer, apply: true, revision });
      setStage({ step: "done", summary: data.summary, backup: data.backup });
      refreshCatalogue();
    } catch (failure) { setStage({ step: "idle" }); setError(failure instanceof Error ? failure.message : "The import could not be completed."); }
  }

  async function undo() {
    if (stage.step !== "done") return;
    const { backup, summary } = stage;
    setStage({ step: "undoing", summary, backup }); setError("");
    try { await post(`/api/studio/catalogue/transfer/${backup}/undo`, {}); setStage({ step: "undone" }); refreshCatalogue(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not undo the import."); setStage({ step: "done", summary, backup }); }
  }

  if (!open) return <div className="catalogue-import-launch"><button type="button" className="inventory-quiet-button" onClick={() => setOpen(true)}><PackagePlus size={16} />Import WordPress products</button></div>;

  const busy = stage.step === "checking" || stage.step === "applying" || stage.step === "undoing";
  return <section className="panel catalogue-import" aria-labelledby="catalogue-import-title" aria-busy={busy}>
    <div className="team-invite-result-heading"><div><div className="eyebrow">OWNER</div><h2 id="catalogue-import-title">Import WordPress products</h2></div>
      <button type="button" className="inventory-quiet-button" aria-label="Close import" disabled={busy} onClick={close}><X size={16} /></button></div>

    {(stage.step === "idle" || stage.step === "checking") && <>
      <p>Choose the catalogue-transfer file prepared from the WordPress shop. You will see what it adds before anything changes.</p>
      <ul className="catalogue-import-rules">
        <li>Products and sizes already in this catalogue are left exactly as they are.</li>
        <li>New sizes arrive as <strong>Not counted</strong> and cannot be sold until stock is counted here.</li>
        <li>A copy of the catalogue is kept, so the import can be undone.</li>
      </ul>
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={choose} />
      <button type="button" className="team-manage-primary" disabled={busy} onClick={() => input.current?.click()}>{stage.step === "checking" ? "Checking file…" : "Choose import file"}</button>
    </>}

    {stage.step === "preview" && <>
      <p><strong>{stage.fileName}</strong> will add:</p>
      <ul className="catalogue-import-summary">
        <li><strong>{plural(stage.summary.added_products, "new product")}</strong></li>
        <li><strong>{plural(stage.summary.added_sizes, "new size")}</strong>, all Not counted</li>
        {stage.summary.added_photo_sets > 0 && <li>{plural(stage.summary.added_photo_sets, "colour photo set")}</li>}
      </ul>
      {stage.summary.kept_products.length > 0 && <p className="catalogue-import-note">Already here and left unchanged: {stage.summary.kept_products.join(", ")}.</p>}
      {stage.summary.skipped_sizes > 0 && <p className="catalogue-import-note">{plural(stage.summary.skipped_sizes, "size")} already in the catalogue will be skipped.</p>}
      <div className="team-manage-actions"><span>Other devices pick up the change automatically.</span>
        {stage.summary.added_products + stage.summary.added_sizes + stage.summary.added_photo_sets > 0
          ? <button type="button" className="team-manage-primary" onClick={apply}>Add to catalogue</button>
          : <button type="button" className="team-manage-primary" onClick={close}>Nothing new to add</button>}</div>
    </>}

    {stage.step === "applying" && <p role="status">Adding products…</p>}

    {(stage.step === "done" || stage.step === "undoing") && <>
      {stage.summary.added_products + stage.summary.added_sizes > 0 && <p role="status">Added {plural(stage.summary.added_products, "product")} and {plural(stage.summary.added_sizes, "size")}. Count stock for each size before selling it.</p>}
      <div className="team-manage-actions"><span>Undo is available until someone next saves a catalogue change.</span>
        <button type="button" className="team-manage-danger-quiet" disabled={stage.step === "undoing"} onClick={undo}>{stage.step === "undoing" ? "Undoing…" : "Undo import"}</button></div>
    </>}

    {stage.step === "undone" && <p role="status">The import was undone. The catalogue is back as it was.</p>}

    {error && <p role="alert" className="collection-error">{error}</p>}
  </section>;
}
