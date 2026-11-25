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
  if (!can(staff, 'office') && !can(staff, 'studio') && can(staff, 'production')) redirect(staff.productionHref ?? '/production');
  if (workspace === 'studio') redirect(staff.studioHref ?? '/showroom');
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(query)) for (const item of Array.isArray(value)?value:value===undefined?[]:[value]) params.append(key,item);
  redirect(`/office/${staff.role}${params.size?`?${params}`:""}`);
}
