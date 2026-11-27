import type { Metadata, Viewport } from "next";
import { requireStaff } from "@/lib/staff-session";
import { can } from "@/lib/staff-permissions";
import { WorkspaceLink } from "../web-app";
import Deliveries from "./deliveries";
import "../showroom/showroom.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "NY Deliveries", description: "Your NY Atelier deliveries.",
  appleWebApp: { capable: true, title: "NY Deliveries" }, icons: { apple: "/studio-assets/icon-180.png", icon: "/ny-mark.svg" }, robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [] };

export default async function DeliveriesPage() {
  const staff = await requireStaff();
  if (!can(staff, "deliveries")) return <main className="staff-access-denied"><h1>Deliveries access restricted.</h1><p>You don’t have permission to see deliveries. Contact your administrator if you need access.</p><WorkspaceLink href={staff.officeHref}>Go to your workspace</WorkspaceLink></main>;
  return <Deliveries name={staff.name} />;
}
