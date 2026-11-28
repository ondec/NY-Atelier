import {can, type StaffIdentity} from "@/lib/staff-permissions";
import {WorkspaceLink} from "./web-app";
import StaffAccountMenu from "./staff-account-menu";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "@/components/icons";
import Notifications, { type PortalNotification } from "./notifications";
import { financePages, financeHref } from "./finance-workspace";
import { layoutComparisonLinksEnabled } from "@/lib/dev-links";

type Section = "overview" | "production" | "orders" | "appointments" | "customers" | "ready-to-wear" | "atelier" | "alterations" | "inventory" | "collections" | "heroes" | "production-inventory" | "finances" | "team";
type Props = { staff: StaffIdentity; current: Section; finance?: string; inventoryView?: string; notifications: PortalNotification[]; unavailable: boolean; children: React.ReactNode };
const primary = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "production", label: "Production", href: "/?section=production" },
  { id: "orders", label: "Orders", href: "/?section=orders" },
  { id: "appointments", label: "Appointments", href: "/?section=appointments" },
  { id: "customers", label: "Customers", href: "/?section=customers" },
  { id: "inventory", label: "Inventory", href: "/?section=inventory" },
  { id: "business", label: "Business", href: "/?section=finances" },
];

export default function TopWorkspaceShell({ staff, current, finance, inventoryView, notifications, unavailable, children }: Props) {
  const comparisonLinks = layoutComparisonLinksEnabled();
  const active = ["orders", "ready-to-wear", "atelier", "alterations"].includes(current) ? "orders" : ["inventory", "collections", "production-inventory"].includes(current) ? "inventory" : ["finances", "team"].includes(current) ? "business" : current;
  const secondary = active === "orders" ? [
    { label: "All orders", href: "/?section=orders", selected: current === "orders" },
  ] : active === "inventory" ? [
    { label: "Stock overview", href: "/?section=inventory", selected: current === "inventory" && inventoryView === "overview" },
    { label: "Products & variants", href: "/?section=inventory&view=products", selected: current === "inventory" && inventoryView === "products" },
    { label: "Collections", href: "/?section=collections", selected: current === "collections" },
    { label: "Stock activity", href: "/?section=inventory&view=activity", selected: current === "inventory" && inventoryView === "activity" },
    { label: "Production inventory", href: "/?section=production-inventory", selected: current === "production-inventory" },
  ] : active === "business" ? [
    { label: "Finance overview", href: "/?section=finances", selected: current === "finances" && !finance },
    ...financePages.filter(page => page.id !== "reports").map(page => ({ label: page.title, href: financeHref(page.id), selected: current === "finances" && finance === page.id })),
    { label: "Team", href: "/?section=team", selected: current === "team" },
  ] : [];
  return <div className="top-workspace-shell">
    <header className="top-workspace-header">
      <div className="top-workspace-brand"><Link prefetch={false} href="/" aria-label="NY Atelier overview"><Image src="/ny-mark.svg" width={42} height={42} alt="" /></Link><div><Link prefetch={false} className="top-workspace-wordmark" href="/">NY ATELIER</Link><details className="top-workspace-switch"><summary>NY Office <ChevronDown size={12} /></summary><div><Link prefetch={false} href="/">NY Office</Link><WorkspaceLink href={staff.studioHref??"/showroom"}>NY Studio</WorkspaceLink>{can(staff,"production")&&<WorkspaceLink href={staff.productionHref??"/production"}>NY Production</WorkspaceLink>}{comparisonLinks && <a href="http://127.0.0.1:3000/">Original layout <ArrowUpRight size={13} /></a>}</div></details></div></div>
      <nav className="top-workspace-primary" aria-label="Main navigation">{primary.map(item => <Link prefetch={false} key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>{item.label}</Link>)}</nav>
      <div className="top-workspace-account"><Notifications items={notifications} unavailable={unavailable} /><StaffAccountMenu staff={staff}/></div>
    </header>
    <div className="top-workspace-context"><div className="top-workspace-preview-label"><span aria-hidden="true" />Layout B · Top navigation</div>{comparisonLinks && <a href="http://127.0.0.1:3000/" className="text-link">Compare original layout <ArrowUpRight size={14} /></a>}</div>
    {secondary.length > 0 && <nav className="top-workspace-secondary" aria-label={`${primary.find(item => item.id === active)?.label} sections`}>{secondary.map(item => <Link prefetch={false} key={item.href} href={item.href} aria-current={item.selected ? "page" : undefined}>{item.label}</Link>)}</nav>}
    <main className="workspace" tabIndex={0}>{children}</main>
  </div>;
}
