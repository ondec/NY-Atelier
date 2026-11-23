"use client";

import Link from "next/link";
import { ArrowRight, Ruler } from "@/components/icons";
import { useEffect, useState } from "react";
import { customerApi, MeasurementSet, type Directory, type Profile } from "./customers-workspace";
import StatusBadge from "./status-badge";

export default function OrderFittingPreview({ customerId, fittingId, showWorkspaceLinks }: { customerId: number; fittingId: number; showWorkspaceLinks: boolean }) {
  const [data, setData] = useState<{ directory: Directory; profile: Profile }>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      customerApi<Directory>("", { signal: controller.signal }),
      customerApi<Profile>(`?id=${customerId}`, { signal: controller.signal }),
    ]).then(([directory, profile]) => {
      if (!controller.signal.aborted) setData({ directory, profile });
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not load the linked fitting.");
    });
    return () => controller.abort();
  }, [customerId, fittingId, revision]);

  const fitting = data?.profile.measurements.find((record) => record.id === fittingId);
  const isCurrent = fitting && data?.profile.measurements[0]?.id === fitting.id;
  const templateName = fitting?.garment_type ? data?.directory.templates?.[fitting.garment_type]?.name : "General measurements";

  return <section className="order-fitting-preview" aria-label={`Fitting ${fittingId} used for this order`}>
    <div className="order-fitting-heading"><h3><Ruler size={18} aria-hidden="true" /> Fitting used for this order</h3>{showWorkspaceLinks && <Link prefetch={false} className="text-link" href={`/?section=customers&customer=${customerId}&fitting=${fittingId}`}>View fitting #{fittingId} <ArrowRight size={15} aria-hidden="true" /></Link>}</div>
    {error ? <p role="alert">{error} <button className="inventory-quiet-button" type="button" onClick={() => { setError(""); setData(undefined); setRevision((value) => value + 1); }}>Retry fitting</button></p> : !data ? <p className="consultation-muted" role="status">Loading linked fitting…</p> : !fitting ? <p className="consultation-muted">Fitting #{fittingId} could not be found in this customer’s record. The order’s linked fitting has not been changed.</p> : <>
      <div className="order-fitting-context"><StatusBadge status={isCurrent ? "Current fitting" : "Previous fitting"} tone={isCurrent ? "success" : "neutral"} /><p>{isCurrent ? "This is the customer’s latest saved fitting." : "This order uses this earlier fitting. The customer’s newer measurements have not replaced it."}</p></div>
      <MeasurementSet customerId={customerId} fitting={fitting} fields={data.directory.fields} templateName={templateName} template={fitting.garment_type ? data.directory.templates?.[fitting.garment_type] : undefined} />
    </>}
  </section>;
}
