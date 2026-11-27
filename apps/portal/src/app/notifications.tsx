"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, ChevronRight, Package, Wallet, X } from "@/components/icons";

import { useStaff } from "./staff-context";
import { can } from "@/lib/staff-permissions";
import { useConsultations } from "./consultations";
import { inventoryChanged, isLowStock, parseInventory, storageKey, variantLabel } from "@/lib/inventory";
import type { StatusTone } from "@/lib/status";
import StatusBadge from "./status-badge";
import { salaryApi, salaryChanged, salaryHref, salaryMoney, type SalaryBatch } from "@/lib/salaries";

export type PortalNotification = { id: string; title: string; detail: string; href: string; tone?: StatusTone };

export default function Notifications({ items, unavailable }: { items: PortalNotification[]; unavailable: boolean }) {
  const staff = useStaff();
  const canFinance = can(staff,"finances");
  const canInventory = can(staff,"catalogue.manage");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<"all" | "orders" | "inventory" | "appointments" | "finance">("all");
  const trigger = useRef<HTMLButtonElement>(null);

  const [salaryAlerts, setSalaryAlerts] = useState<PortalNotification[]>([]);
  useEffect(() => {
    if (!canFinance) return;
    let active = true;
    function refreshSalaries() {
      salaryApi<{ batches: SalaryBatch[] }>().then(({ batches }) => {
        if (active) setSalaryAlerts(batches.filter(row => row.status === "submitted" || row.status === "returned").map(row => ({
          id: row.id, title: row.status === "submitted" ? "Salary approval needed" : "Salary batch returned",
          detail: `${row.label} · ${row.entries.length} tailors · ${salaryMoney(row.total_minor)}`,
          tone: row.status === "submitted" ? "warning" as const : "danger" as const, href: salaryHref(row.id),
        })));
      }).catch(() => { if (active) setSalaryAlerts([]); });
    }
    refreshSalaries();
    const timer = setInterval(refreshSalaries, 60000);
    window.addEventListener(salaryChanged, refreshSalaries);
    return () => { active = false; clearInterval(timer); window.removeEventListener(salaryChanged, refreshSalaries); };
  }, [canFinance]);

  const [stockAlerts, setStockAlerts] = useState<PortalNotification[]>([]);

  useEffect(() => {
    if (!canInventory) return;
    function refreshStockAlerts() {
      const inventory = parseInventory(localStorage.getItem(storageKey));
      const alerts = inventory.variants
        .filter((row) => row.stockVerified !== false && (row.quantity === 0 || isLowStock(row)))
        .sort((a, b) => a.quantity - b.quantity)
        .flatMap((row) => {
          const product = inventory.products.find((item) => item.id === row.productId);
          if (!product) return [];
          return [{
            id: row.id,
            title: row.quantity === 0 ? "Ready-to-wear out of stock" : "Ready-to-wear low stock",
            tone: row.quantity === 0 ? "danger" as const : "warning" as const,
            detail: `${product.name} · ${variantLabel(row)} / ${row.size} · ${row.quantity} left`,
            href: `/ready-to-wear?view=products&product=${encodeURIComponent(product.id)}`,
          }];
        });
      setStockAlerts(alerts);
    }
    function onStorage(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) refreshStockAlerts();
    }
    queueMicrotask(refreshStockAlerts);
    window.addEventListener(inventoryChanged, refreshStockAlerts);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(inventoryChanged, refreshStockAlerts);
      window.removeEventListener("storage", onStorage);
    };
  }, [canInventory]);

  const { rows: consultations } = useConsultations();
  const consultationAlerts = consultations
    .filter((row) => row.status === "awaiting-confirmation" || row.status === "needs-alternatives")
    .map((row) => ({
      id: row.id,
      title: row.status === "awaiting-confirmation" ? "New consultation request" : "Customer requested other times",
      tone: row.status === "awaiting-confirmation" ? "info" as const : "warning" as const,
      detail: `${row.customer_name ?? "Customer"} · ${row.purpose}`,
      href: `/?section=appointments&consultation=${encodeURIComponent(row.id)}`,
    }));
  const count = items.length + stockAlerts.length + consultationAlerts.length + salaryAlerts.length;
  const priorityTone = [...items, ...stockAlerts, ...consultationAlerts, ...salaryAlerts].some((item) => item.tone === "danger") ? "danger" : [...items, ...stockAlerts, ...consultationAlerts, ...salaryAlerts].some((item) => item.tone === "warning") ? "warning" : "info";
  const groups = [
    { id: "finance", label: "Salary approvals", items: salaryAlerts, Icon: Wallet },
    { id: "orders", label: "Order reminders", items, Icon: CalendarDays },
    { id: "inventory", label: "Ready-to-wear stock alerts", items: stockAlerts, Icon: Package },
    { id: "appointments", label: "Consultation alerts", items: consultationAlerts, Icon: CalendarDays },
  ].filter((group) => filter === "all" || filter === group.id);

  const filters = [
    { id: "all", label: "All", count },
    { id: "orders", label: "Orders", count: items.length },
    { id: "inventory", label: "Inventory", count: stockAlerts.length },
    { id: "appointments", label: "Consultations", count: consultationAlerts.length },
    { id: "finance", label: "Finances", count: salaryAlerts.length },
  ] as const;
  const visibleFilters = filters.filter(option => (option.id !== "finance" || canFinance) && (option.id !== "inventory" || canInventory));

  function closeDrawer() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  return <div className="notification-root">
    <button ref={trigger} className={`notification-trigger ${open ? "is-open" : ""}`} type="button"
      title="View notifications" aria-label={`Notifications${count ? `, ${count} alerts and reminders` : ""}`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls="notification-panel" onClick={() => {
        setFilter("all");
        dialog.current?.showModal();
        setOpen(true);
      }}>
      <Bell size={19} />
      {count > 0 && <span className="notification-count" data-tone={priorityTone}>{count}</span>}
    </button>
    <dialog ref={dialog} id="notification-panel" className="inventory-drawer notification-drawer"
      aria-labelledby="notification-title" onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
      <div className="notification-drawer-content">
        <div className="notification-drawer-header">
          <div className="notification-heading">
            <div><h2 id="notification-title">Notifications</h2><p>Review reminders and alerts that need attention.</p></div>
            <button type="button" aria-label="Close notifications" title="Close notifications" onClick={closeDrawer}><X size={17} /></button>
          </div>
          <div className="notification-filters" role="group" aria-label="Filter notifications">
            {visibleFilters.map((option) => <button key={option.id} type="button" aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}>{option.label} <span>{option.count}</span></button>)}
          </div>
        </div>
        {unavailable && (filter === "all" || filter === "orders") && <p className="notification-group-label">Order reminders are unavailable.</p>}
        {groups.some((group) => group.items.length) ? <div className="notification-list">
          {groups.filter((group) => group.items.length).map(({ id, label, items, Icon }) => <div key={id}>
            <h3 className="notification-group-label">{label}</h3>
            {items.map((item) => <Link prefetch={false} key={item.id} href={item.href} onClick={closeDrawer} className="notification-item" data-tone={item.tone ?? "info"}>
              <span className="notification-item-icon"><Icon size={17} /></span>
              <span><strong>{item.title}</strong><p>{item.detail}</p>{item.tone === "danger" && <StatusBadge className="notification-priority" status="Urgent" tone="danger" />}{item.tone === "warning" && <StatusBadge className="notification-priority" status="Needs attention" tone="warning" />}</span><ChevronRight size={15} aria-hidden="true" />
            </Link>)}
          </div>)}
        </div> : <div className="notification-empty">
          <Bell size={25} aria-hidden="true" />
          <strong>{filter === "appointments" ? "No consultation alerts" : "No alerts in this view"}</strong>
          <p>{filter === "appointments" ? "New requests and requests for other times will appear here." : "New alerts will appear here when something needs attention."}</p>
        </div>}
      </div>
    </dialog>
  </div>;
}
