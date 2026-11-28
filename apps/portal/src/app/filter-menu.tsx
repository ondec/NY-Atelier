"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "@/components/icons";

/**
 * One "Filters" drop-down holding a desk's filters (each a labelled field), with "Clear filters" beside it.
 * `count` is how many filters are set; the panel closes on a click elsewhere or Escape.
 */
export default function FilterMenu({ count, onClear, canClear = count > 0, children }: { count: number; onClear: () => void; canClear?: boolean; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: Event) => { const element = menu.current; if (element?.open && (event instanceof KeyboardEvent ? event.key === "Escape" : !element.contains(event.target as Node))) element.open = false; };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, []);
  return <>
    <details className="order-filter-menu" ref={menu}>
      <summary><SlidersIcon />Filters{count ? <span className="order-filter-count">{count}</span> : null}<ChevronDown size={15} aria-hidden="true" /></summary>
      <div className="order-filter-panel">{children}</div>
    </details>
    {canClear && <button type="button" className="order-filter-clear" onClick={onClear}>Clear filters</button>}
  </>;
}

function SlidersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
}
