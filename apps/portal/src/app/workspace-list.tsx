import { LayoutDashboard, Package, Scissors, Shirt, Tablet } from "@/components/icons";
import { can, type StaffIdentity } from "@/lib/staff-permissions";

export type WorkspaceKey = "office" | "studio" | "production" | "ready-to-wear" | "deliveries";

/** Every workspace this person may open, NY Office first. Uses the same rules as the side rail. */
export function staffWorkspaces(staff: StaffIdentity) {
  const list: { key: WorkspaceKey; label: string; href: string; Icon: typeof LayoutDashboard }[] = [];
  if (can(staff, "office") && can(staff, "orders.read")) list.push({ key: "office", label: "NY Office", href: staff.officeHref, Icon: LayoutDashboard });
  if (can(staff, "studio")) list.push({ key: "studio", label: "NY Studio", href: staff.studioHref ?? "/showroom", Icon: Tablet });
  if (can(staff, "production")) list.push({ key: "production", label: "NY Production", href: staff.productionHref ?? "/production", Icon: Scissors });
  if (can(staff, "catalogue.manage")) list.push({ key: "ready-to-wear", label: "Ready-to-Wear", href: "/ready-to-wear", Icon: Shirt });
  if (can(staff, "deliveries") && can(staff, "orders.manage")) list.push({ key: "deliveries", label: "Deliveries", href: "/deliveries", Icon: Package });
  return list;
}
