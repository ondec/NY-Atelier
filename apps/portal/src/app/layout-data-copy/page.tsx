import { requireStaff } from "@/lib/staff-session";
import { redirect } from "next/navigation";
import { layoutComparisonLinksEnabled } from "@/lib/dev-links";
import LayoutDataCopy from "./transfer";

export default async function LayoutDataCopyPage() {
  const staff = await requireStaff();
  if (staff.role !== "owner") redirect(staff.officeHref);
  return <LayoutDataCopy comparison={process.env.NY_WORKSPACE_LAYOUT === "top"} comparisonLinks={layoutComparisonLinksEnabled()} />;
}
