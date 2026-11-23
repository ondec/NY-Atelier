import { currentStaff } from "@/lib/staff-session";
import { can } from "@/lib/staff-permissions";
import { catalogueSyncAllowed } from "@/lib/workspace-hosts";
import { headers } from "next/headers";
import { StaffProvider } from "./staff-context";
import StudioCatalogueSync from "./studio-catalogue-sync";
import { WebAppProvider } from "./web-app";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import WorkspaceRail from "./workspace-rail";

export const metadata: Metadata = {
  title: process.env.NY_WORKSPACE_LAYOUT === "top" ? "NY Atelier | Top Navigation Preview" : "NY Atelier | NY Office",
  description: "NY Office: NY Atelier’s workspace for orders, clients and business operations.",
  manifest: "/office.webmanifest",
  appleWebApp: { capable: true, title: "NY Office", statusBarStyle: "default" },
  icons: { apple: "/studio-assets/icon-180.png", icon: "/ny-mark.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#123c45" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const staff = await currentStaff();
  const catalogueSync = catalogueSyncAllowed(await headers());
  const topPreview = process.env.NY_WORKSPACE_LAYOUT === "top" && staff?.role === "owner";
  return (
    <html lang="en">
      <body><WebAppProvider><StaffProvider staff={staff}><div className={`workspace-frame${topPreview ? " workspace-frame-top" : ""}${!staff ? " workspace-signed-out" : ""}`}>{staff && !topPreview && <WorkspaceRail officeHref={staff.officeHref} studioHref={staff.studioHref} />}<div className="workspace-surface">{can(staff,"catalogue.manage") && <StudioCatalogueSync enabled={catalogueSync} />}{children}</div></div></StaffProvider></WebAppProvider></body>
    </html>
  );
}
