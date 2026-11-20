import type { Metadata, Viewport } from "next";
import { requireStaff } from "@/lib/staff-session";
import Showroom from "./showroom";
import "./showroom.css";
import {readStudioLocation} from '@/lib/studio-location';
import {can} from '@/lib/staff-permissions';
import {WorkspaceLink} from '../web-app';
export const metadata: Metadata = {
  title: "NY Studio", description: "Customer fittings and ready-to-wear sales at NY Atelier.",
  manifest: "/studio.webmanifest", appleWebApp: { capable: true, title: "NY Studio" },
  icons: { apple: "/studio-assets/icon-180.png", icon: "/ny-mark.svg" }, robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [] };
export default async function ShowroomPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const staff = await requireStaff("studio");
  if (!can(staff, 'studio')) return <main className="staff-access-denied"><h1>NY Studio access restricted.</h1><p>You don’t have permission to access NY Studio. Contact your administrator if you need access.</p>{can(staff, 'office') && <WorkspaceLink href={staff.officeHref}>Open NY Office</WorkspaceLink>}</main>;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  return <Showroom staff={staff} initialLocation={readStudioLocation(query.toString())} />;
}
