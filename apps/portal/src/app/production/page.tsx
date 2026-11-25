import type { Metadata, Viewport } from "next";
import { requireStaff } from "@/lib/staff-session";
import { can } from "@/lib/staff-permissions";
import { WorkspaceLink } from "../web-app";
import ProductionStudio from "./production-studio";
import "../showroom/showroom.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "NY Production", description: "Custom and alteration orders in the NY Atelier workroom.",
  appleWebApp: { capable: true, title: "NY Production" }, icons: { apple: "/studio-assets/icon-180.png", icon: "/ny-mark.svg" }, robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [] };

export default async function ProductionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const staff = await requireStaff();
  if (!can(staff, "production")) return <main className="staff-access-denied"><h1>NY Production access restricted.</h1><p>You don’t have permission to access NY Production. Contact your administrator if you need access.</p>{can(staff, "office") && <WorkspaceLink href={staff.officeHref}>Open NY Office</WorkspaceLink>}</main>;
  const query = await searchParams;
  const order = typeof query.order === "string" && /^[A-Z0-9-]{3,40}$/.test(query.order) ? query.order : undefined;
  return <ProductionStudio staff={staff} initialOrder={order} initialView={query.view === "tailors" && can(staff, "production.manage") ? "tailors" : "orders"} />;
}
