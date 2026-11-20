import { requireStaff } from "@/lib/staff-session";
import { can, officeAccessDeniedMessage, roleLabels, sectionAllowed, type StaffIdentity } from "@/lib/staff-permissions";
import { WorkspaceLink } from "./web-app";
import StaffAccountMenu from "./staff-account-menu";
import OwnerOverview from "./owner-overview";
import CustomersWorkspace from "./customers-workspace";
import Link from "next/link";
import { ArrowLeft,
  ArrowRight, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Grid2X2,
  Package, Scissors, Shirt, Sparkles, Users, Wallet, UserRoundCog,
  type NyIconComponent,
} from "@/components/icons";
import { DemoOrder, getDemoOrders } from "@/lib/orders";
import SalaryWorkspace from "./salary-workspace";
import TeamWorkspace from "./team-workspace";
import TopWorkspaceShell from "./top-workspace-shell";
import FinanceWorkspace, { FinanceOverview, financePages, financeHref, financeNavigation, resolveFinancePage, type FinancePageId } from "./finance-workspace";
import Notifications, { type PortalNotification } from "./notifications";
import ReadyToWearInventory, { type InventoryView } from "./rtw-inventory";

import { OrderTable, orderDate as date, serviceName } from "./order-table";
import ServiceOrderDesk from "./service-order-desk";
import OrderDetailsContent from "./order-details-content";
import StatusBadge from "./status-badge";
import { isCancelledStatus, isClosedStatus } from "@/lib/status";
import CreateStaffOrder from "./create-staff-order";
import { parseOrderType } from "@/lib/order-desk";
import Consultations from "./consultations";
import CollectionsWorkspace from "./collections-workspace";

export const dynamic = "force-dynamic";

type Section = "overview" | "orders" | "appointments" | "customers" | "ready-to-wear" | "atelier" | "alterations" | "inventory" | "collections" | "production-inventory" | "finances" | "team";
type NavItem = { id: Section; label: string; icon: NyIconComponent };
const nav: { group: string; items: NavItem[] }[] = [
  { group: "Workspace", items: [{ id: "overview", label: "Overview", icon: Grid2X2 }, { id: "orders", label: "All orders", icon: ClipboardList }, { id: "appointments", label: "Consultations", icon: CalendarDays }, { id: "customers", label: "Customers", icon: Users }] },
  { group: "Services", items: [{ id: "ready-to-wear", label: "Ready-to-wear", icon: Shirt }, { id: "atelier", label: "Atelier · Bespoke", icon: Sparkles }] },
  { group: "Business", items: [{ id: "production-inventory", label: "Production inventory", icon: Package }, { id: "finances", label: "Finances", icon: Wallet }, { id: "team", label: "Team", icon: UserRoundCog }] },
];
const allItems: NavItem[] = [...nav.flatMap((group) => group.items), { id: "alterations", label: "Alterations", icon: Scissors }];
const inventoryHref = (view: InventoryView) => view === "overview" ? "/?section=inventory" : `/?section=inventory&view=${view}`;
const planned: Partial<Record<Section, { title: string; intro: string; detail: string }>> = {
  "production-inventory": { title: "Production inventory", intro: "Materials and supplies for work in the atelier.", detail: "Fabric, trims, linings, buttons, packaging and other production supplies will be managed here once the NY team defines purchasing, units, usage and stock rules. This is separate from finished ready-to-wear garment stock." },
  finances: { title: "Finances", intro: "Business operations.", detail: "Sales, expenses, balances and upcoming bills will appear here when their records and access controls are in place. Order payment labels alone are not a financial report." },
};
const href = (id: Section) => `/?section=${id}`;


function Sidebar({ current, currentBill, inventoryView, staff }: { staff: StaffIdentity; current: Section; currentBill?: FinancePageId; inventoryView?: InventoryView }) {
  return <aside className="sidebar">
    <div className="sidebar-body"><div className="sidebar-brand"><div><strong>NY ATELIER</strong><span>NY OFFICE</span></div></div>
      <nav aria-label="NY Office">{nav.map(group => ({...group,items:group.items.filter(item => sectionAllowed(staff,item.id) && (item.id !== "ready-to-wear" || can(staff,"catalogue.manage")))})).filter(group => group.items.length).map((group) => <div className="nav-group" key={group.group}><div className="nav-group-label">{group.group}</div>{group.items.map(({ id, label, icon: Icon }) => id === "ready-to-wear" ? <details className="nav-disclosure" key={id} open={current === "ready-to-wear" || current === "inventory" || current === "collections"}><summary className={`nav-link ${current === "ready-to-wear" || current === "inventory" || current === "collections" ? "active" : ""}`}><Icon size={17} /><span>{label}</span><ChevronDown className="disclosure-chevron" size={15} /></summary><div className="nav-submenu"><Link href={href("ready-to-wear")} className={`nav-sub-link ${current === "ready-to-wear" ? "active" : ""}`} aria-current={current === "ready-to-wear" ? "page" : undefined}>Order desk</Link><Link href={href("collections")} className={`nav-sub-link ${current === "collections" ? "active" : ""}`} aria-current={current === "collections" ? "page" : undefined}>Collections</Link><div className="nav-sub-group-label">GARMENT INVENTORY</div>{([{ id: "overview", label: "Stock overview" }, { id: "products", label: "Products & variants" }, { id: "activity", label: "Stock activity" }] as const).map((item) => <Link key={item.id} href={inventoryHref(item.id)} className={`nav-sub-link ${current === "inventory" && inventoryView === item.id ? "active" : ""}`} aria-current={current === "inventory" && inventoryView === item.id ? "page" : undefined}>{item.label}</Link>)}</div></details> : id === "finances" ? <details className="nav-disclosure" key={id} open={current === "finances"}><summary className={`nav-link ${current === "finances" ? "active" : ""}`}><Icon size={17} /><span>{label}</span><ChevronDown className="disclosure-chevron" size={15} /></summary><div className="nav-submenu"><Link href={href("finances")} className={`nav-sub-link ${current === "finances" && !currentBill ? "active" : ""}`} aria-current={current === "finances" && !currentBill ? "page" : undefined}>Finance overview</Link>{financeNavigation.map(section => <div className="finance-nav-group" key={section.label}><div className="nav-sub-group-label">{section.label}</div>{section.pages.map(pageId => { const page = financePages.find(item => item.id === pageId)!; return <Link key={page.id} href={financeHref(page.id)} className={`nav-sub-link ${currentBill === page.id ? "active" : ""}`} aria-current={currentBill === page.id ? "page" : undefined}>{page.title}</Link>; })}</div>)}</div></details> : <Link key={id} href={href(id)} className={`nav-link ${current === id ? "active" : ""}`} aria-current={current === id ? "page" : undefined}><Icon size={17} /><span>{label}</span></Link>)}</div>)}</nav>

    </div>
  </aside>;
}

const orderSections = new Set<Section>(["overview", "orders", "ready-to-wear", "atelier", "alterations"]);


function SummaryCard({ title, count, note, primary = false }: { title: string; count: string | number; note: string; primary?: boolean }) {
  return <article className={`summary-card ${primary ? "primary" : ""}`}><span>{title}</span><strong>{count}</strong><small>{note}</small></article>;
}

function Overview({ orders, unavailable, staff }: { orders: DemoOrder[]; unavailable: boolean; staff: StaffIdentity }) {
  if (staff.role === "owner") return <OwnerOverview initialOrders={orders} initiallyUnavailable={unavailable}/>;
  const active = orders.filter((order) => !order.is_complete);
  const today = new Date().toISOString().slice(0, 10);
  const weekDate = new Date(`${today}T00:00:00Z`);
  weekDate.setUTCDate(weekDate.getUTCDate() + 7);
  const week = weekDate.toISOString().slice(0, 10);
  const due = active.filter((order) => order.expected_completion_date && order.expected_completion_date >= today && order.expected_completion_date <= week);
  const actions = active.filter((order) => order.client_action);
  const count = (value: number) => unavailable ? "—" : value;
  return <><div className="eyebrow">NY OFFICE / OVERVIEW</div><div className="page-heading"><div><h1>At a glance.</h1><p>Orders, services and the work needing your attention.</p></div><span className="date-chip">{new Intl.DateTimeFormat("en-GH", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date())}</span></div>
    <div className="summary-grid"><SummaryCard primary title="Active orders" count={count(active.length)} note="Across all three services" /><SummaryCard title="Due in 7 days" count={count(due.length)} note="Expected completion dates" /><SummaryCard title="Customer action" count={count(actions.length)} note="Recorded on active orders" /><SummaryCard title="Completed" count={count(orders.filter((order) => order.is_complete && !isCancelledStatus(order.status)).length)} note="In connected records" /></div>
    <div className="dashboard-grid"><section className="panel orders-panel"><div className="panel-heading"><div><div className="eyebrow">ORDER DESK</div><h2>In motion</h2></div><Link href={href("orders")} className="text-link">View all orders <ArrowRight size={16} /></Link></div><OrderTable orders={active.slice(0, 5)} unavailable={unavailable} section="overview" /></section><aside className="panel focus-panel"><div className="eyebrow">TO KEEP IN VIEW</div><h2>Today&apos;s focus</h2>{unavailable ? <p>Order information is unavailable.</p> : actions.length ? <div className="focus-list">{actions.slice(0, 3).map((order) => <div className="focus-item" key={order.reference}><span className="focus-dot" /><div><strong>{order.customer_name}</strong><p>{order.client_action}</p><small>{order.reference} · {serviceName(order)}</small></div></div>)}</div> : <p>No customer actions are recorded on active orders.</p>}<div className="focus-footer"><CalendarDays size={18} /><span>Review consultation requests and proposed times in Consultations.</span></div></aside></div>
    <section className="services-section"><div className="services-heading"><div><div className="eyebrow">THREE SERVICES / ONE WORKSPACE</div><h2>Move between the work.</h2></div><p>Each service keeps its own order journey.</p></div><div className="service-grid">{([{ id: "ready-to-wear", title: "Ready-to-wear", kicker: "01 / THE COLLECTION", description: "Products and fulfilment", category: "Ready-to-Wear", icon: Shirt }, { id: "atelier", title: "Atelier", kicker: "02 / CUSTOM & BESPOKE", description: "Consultations to final fitting", category: "Custom", icon: Sparkles }, { id: "alterations", title: "Alterations", kicker: "03 / FIT & FINISH", description: "Adjustments and handover", category: "Alterations", icon: Scissors }] as const).map(({ id, title, kicker, description, category, icon: Icon }) => <Link href={id === "alterations" || !can(staff,"orders.manage") ? `${href("orders")}&type=${category}` : href(id)} className="service-card" key={id}><span className="service-icon"><Icon size={21} /></span><span className="service-copy"><small>{kicker}</small><strong>{title}</strong><span>{description}</span></span><span className="service-end"><strong>{unavailable ? "—" : orders.filter((order) => order.category === category).length.toString().padStart(2, "0")}</strong><ArrowRight size={17} /></span></Link>)}</div></section>
  </>;
}

function OrdersWorkspace({ section, orders, unavailable, consultationId, initialType, staff }: { staff: StaffIdentity; section: Section; orders: DemoOrder[]; unavailable: boolean; consultationId?: string; initialType?: DemoOrder["category"] | "" }) {
  const content: Record<string, { kicker: string; title: string; intro: string; category?: DemoOrder["category"] }> = {
    orders: { kicker: "ORDER DESK / ALL SERVICES", title: "All orders.", intro: "One desk for every order, with each service kept distinct." },
    "ready-to-wear": { kicker: "SERVICE 01 / THE COLLECTION", title: "Ready-to-wear.", intro: "The collection, from purchase to handover.", category: "Ready-to-Wear" },
    atelier: { kicker: "SERVICE 02 / CUSTOM & BESPOKE", title: "The Atelier.", intro: "Custom clothing from first conversation to final fitting.", category: "Custom" },
    alterations: { kicker: "SERVICE 03 / FIT & FINISH", title: "Alterations.", intro: "Garments, adjustments and promised completion dates.", category: "Alterations" },
  };
  const view = content[section];
  const filtered = view.category ? orders.filter((order) => order.category === view.category) : orders;
  const staffCategory = section === "atelier" && can(staff,"orders.manage") ? "Custom" : section === "alterations" && can(staff,"alterations.create") ? "Alterations" : null;
  return <>
    <div className="eyebrow">{view.kicker}</div>
    <div className="page-heading">
      <div><h1>{view.title}</h1><p>{view.intro}</p></div>
      {staffCategory ? (
        <CreateStaffOrder key={consultationId ?? section} category={staffCategory} consultationId={section === "atelier" ? consultationId : undefined} />
      ) : <span className="date-chip">{unavailable ? "—" : filtered.length} connected orders</span>}
    </div>
    <ServiceOrderDesk key={`${section}-${initialType}`} initialType={initialType} section={section} orders={filtered} unavailable={unavailable} />
  </>;
}

function OrderDetails({ order, reference, section, unavailable }: {
  order?: DemoOrder;
  reference: string;
  section: Section;
  unavailable: boolean;
}) {
  const backLabel = allItems.find((item) => item.id === section)?.label ?? "All orders";
  const back = <Link href={href(section)} className="text-link"><ArrowLeft size={14} /> Back to {backLabel}</Link>;
  if (!order) return <>{back}<div className="page-heading"><h1>{reference}</h1></div><p className="empty-state">{unavailable ? "Order details are temporarily unavailable." : "This order could not be found in this section."}</p></>;

  return <>
    {back}
    <div className="page-heading order-detail-heading">
      <div><h1>{order.reference}</h1><p>{serviceName(order)} · {order.customer_name}</p></div>
      <StatusBadge status={order.status} />
    </div>
    <OrderDetailsContent order={order} />
  </>;
}

function PlannedWorkspace({ section }: { section: Section }) {
  const content = planned[section]!;
  const Icon = allItems.find((item) => item.id === section)!.icon;
  return <><div className="eyebrow">NY OFFICE / NEXT MODULE</div><div className="page-heading"><div><h1>{content.title}.</h1><p>{content.intro}</p></div></div><div className="planned-panel"><span className="planned-icon"><Icon size={30} /></span><div className="eyebrow">WORKSPACE STRUCTURE</div><h2>{content.title} belongs here.</h2><p>{content.detail}</p><Link href="/" className="text-link">Return to overview <ArrowRight size={17} /></Link></div>{section === "finances" && <section className="finance-categories"><div className="eyebrow">FINANCE WORKSPACES</div><h2>Money and commitments.</h2><div className="offering-grid">{financePages.map((page) => <Link key={page.id} href={financeHref(page.id)} className="offering-card"><strong>{page.title}</strong><ArrowRight size={16} /></Link>)}</div></section>}</>;
}

function recordId(value: string | string[] | undefined) {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 0;
  return id > 0 && Number.isSafeInteger(id) ? id : undefined;
}

export default async function OfficeWorkspace({ searchParams }: { searchParams: Promise<{ section?: string | string[]; type?: string | string[]; offering?: string | string[]; bill?: string | string[]; view?: string | string[]; finance?: string | string[]; salary?: string | string[]; product?: string | string[]; order?: string | string[]; consultation?: string | string[]; customer?: string | string[]; fitting?: string | string[] }> }) {
  const staff = await requireStaff();
  if (!can(staff,'office')) return <main className="staff-access-denied"><h1>NY Office access restricted.</h1><p>{officeAccessDeniedMessage}</p>{can(staff,'studio')&&<WorkspaceLink href={staff.studioHref??'/showroom'}>Return to NY Studio</WorkspaceLink>}</main>;
  const query = await searchParams;
  const requested = query.section;
  const current: Section = typeof requested === "string" && (requested === "inventory" || requested === "collections" || allItems.some((item) => item.id === requested)) ? requested as Section : "overview";
  const financeRoute = current === "finances" ? resolveFinancePage(query.finance, query.bill) : {};
  const currentBill = financeRoute.id;
  if (!sectionAllowed(staff,current,currentBill)) return <div className="staff-access-denied"><h1>This area isn’t available for your role.</h1><p>You are signed in as {roleLabels[staff.role]}.</p><Link href={staff.officeHref}>Return to your NY Office</Link></div>;
  const inventoryView: InventoryView | undefined = current === "inventory" ? query.view === "products" || query.view === "activity" ? query.view : "overview" : undefined;
  let orders: DemoOrder[] = [];
  let unavailable = false;
  try { orders = await getDemoOrders(true); } catch { unavailable = true; }
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 7);
  const notifications: PortalNotification[] = orders.filter((order) => !order.is_complete && !isClosedStatus(order.status)).flatMap((order) => {
    const items: PortalNotification[] = [];
    if (order.client_action) items.push({ id: `${order.reference}-action`, title: "Customer action pending", tone: "warning", detail: `${order.reference} · ${order.client_action}`, href: href("orders") });
    if (order.expected_completion_date && order.expected_completion_date <= soon.toISOString().slice(0, 10)) items.push({ id: `${order.reference}-due`, tone: order.expected_completion_date < today ? "danger" : "warning", title: order.expected_completion_date < today ? "Order past expected date" : order.expected_completion_date === today ? "Order expected today" : "Order due soon", detail: `${order.reference} · ${date(order.expected_completion_date)} · ${serviceName(order)}`, href: href("orders") });
    return items;
  });
  const orderReference = orderSections.has(current) && typeof query.order === "string" ? query.order : undefined;
  const selectedOrder = orderReference ? orders.find((order) => order.reference === orderReference && (
    current === "overview" || current === "orders" ||
    (current === "ready-to-wear" && order.category === "Ready-to-Wear") ||
    (current === "atelier" && order.category === "Custom") ||
    (current === "alterations" && order.category === "Alterations")
  )) : undefined;
  const workspaceContent = orderReference ? <OrderDetails order={selectedOrder} reference={orderReference} section={current} unavailable={unavailable} /> : current === "overview" ? <Overview staff={staff} orders={orders} unavailable={unavailable} />  : currentBill === "salaries" ? <SalaryWorkspace selectedId={typeof query.salary === "string" ? query.salary : undefined} /> : currentBill ? <FinanceWorkspace id={currentBill} initialType={financeRoute.type} /> : current === "finances" ? <FinanceOverview /> : current === "team" ? <TeamWorkspace /> : current === "appointments" ? <Consultations selectedId={typeof query.consultation === "string" ? query.consultation : undefined} /> : current === "customers" ? <CustomersWorkspace key={recordId(query.customer) ?? "directory"} customerId={recordId(query.customer)} fittingId={recordId(query.fitting)} /> : current === "collections" ? <CollectionsWorkspace /> : inventoryView ? <ReadyToWearInventory key={typeof query.product === "string" ? query.product : "inventory"} view={inventoryView} productId={typeof query.product === "string" ? query.product : undefined} /> : planned[current] ? <PlannedWorkspace section={current} /> : <OrdersWorkspace staff={staff} section={current} initialType={current === "orders" ? parseOrderType(query.type) : ""} orders={orders} unavailable={unavailable} consultationId={typeof query.consultation === "string" ? query.consultation : undefined} />;
  if (process.env.NY_WORKSPACE_LAYOUT === "top" && staff.role === "owner") return <TopWorkspaceShell staff={staff} current={current} finance={currentBill} inventoryView={inventoryView} notifications={notifications} unavailable={unavailable}>{workspaceContent}</TopWorkspaceShell>;
  return <div className="portal-shell"><Sidebar staff={staff} current={current} currentBill={currentBill} inventoryView={inventoryView} /><div className="portal-main"><header className="topbar"><div className="breadcrumb"><span>NY Atelier</span><ChevronRight size={14} /><strong>{currentBill ? financePages.find((page) => page.id === currentBill)?.title : current === "collections" ? "Collections" : inventoryView ? inventoryView === "overview" ? "Garment inventory" : inventoryView === "products" ? "Products & variants" : "Stock activity" : allItems.find((item) => item.id === current)?.label}</strong></div><div className="topbar-profile"><Notifications items={notifications} unavailable={unavailable} /><StaffAccountMenu staff={staff}/></div></header><main className="workspace" key={JSON.stringify(query)} tabIndex={0}>{workspaceContent}</main></div></div>;
}
