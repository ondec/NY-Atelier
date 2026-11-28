import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/staff-session";
import { headers } from "next/headers";
import { workspaceForHost } from "@/lib/workspace-hosts";
import { can } from "@/lib/staff-permissions";
export const dynamic = "force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query = await searchParams;
  const workspace = query.section ? 'office' : workspaceForHost(await headers());
  const staff = await requireStaff(workspace);
  // Each role lands in its own space; only Office roles use the Office pages below.
  if (!can(staff, 'office')) redirect(staff.officeHref);
  if (workspace === 'studio') redirect(staff.studioHref ?? '/showroom');
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(query)) for (const item of Array.isArray(value)?value:value===undefined?[]:[value]) params.append(key,item);
  redirect(`/office/${staff.role}${params.size?`?${params}`:""}`);
}
