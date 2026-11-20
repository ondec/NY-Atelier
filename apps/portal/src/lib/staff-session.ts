import { headers } from 'next/headers';
import { tokenFromCookie } from './staff-cookie';
import { sameOrigin } from './request-security';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { can, type StaffIdentity, type StaffPermission } from './staff-permissions';
import { workspaceLinks } from './workspace-hosts';
export async function staffToken(request?:Request) {return tokenFromCookie(request?request.headers.get('cookie'):(await headers()).get('cookie'));}
export async function staffBackendHeaders(request?:Request):Promise<Record<string,string>> {
  const token=await staffToken(request);return {Accept:'application/json','Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
}
export async function readStaff(request?:Request):Promise<StaffIdentity|null> {
  if(!await staffToken(request))return null;
  try {
    const response=await fetch(`${process.env.API_BASE_URL??'http://127.0.0.1:8000'}/api/staff/auth/me`,{cache:'no-store',headers:await staffBackendHeaders(request),signal:AbortSignal.timeout(8000)});
    if(!response.ok)return null;const {staff}=await response.json();
    if(!staff||!['owner','manager','receptionist'].includes(staff.role)||!Array.isArray(staff.permissions))return null;
    return {...staff,...workspaceLinks(request?.headers ?? await headers(),staff.role)};
  }catch{return null;}
}
export const currentStaff=cache(()=>readStaff());
export async function requireStaff(destination:'studio'|'office'='office') {
  const staff=await currentStaff();if(!staff)redirect(`/staff/sign-in?next=${destination}`);return staff;
}
export async function staffRequestError(request:Request,permission:StaffPermission) {
  if(!sameOrigin(request))return Response.json({message:"Open this page to save changes."},{status:403});
  const staff=await readStaff(request);
  if(!staff)return Response.json({message:'Sign in with your staff account.'},{status:401,headers:{'Cache-Control':'no-store'}});
  if(!can(staff,permission))return Response.json({message:'This action is not available for your staff role.'},{status:403});
  return null;
}
