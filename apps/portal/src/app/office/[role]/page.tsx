import {redirect} from 'next/navigation';
import OfficeWorkspace from '../../office-workspace';
import {requireStaff} from '@/lib/staff-session';
import {can} from '@/lib/staff-permissions';
export const dynamic='force-dynamic';
type Query=Awaited<Parameters<typeof OfficeWorkspace>[0]['searchParams']>;
const queryString=(query:Query)=>{const params=new URLSearchParams();for(const [key,value] of Object.entries(query))for(const item of Array.isArray(value)?value:value===undefined?[]:[value])params.append(key,item);return params.size?`?${params}`:'';};
export default async function OfficePage({params,searchParams}:{params:Promise<{role:string}>;searchParams:Parameters<typeof OfficeWorkspace>[0]['searchParams']}){
  const staff=await requireStaff();
  if(!can(staff,'office'))redirect(staff.officeHref);
  const query=await searchParams;
  // Ready-to-Wear stock and collections live in their own workspace; old Office links forward there.
  if(query.section==='inventory'||query.section==='collections'||!can(staff,'orders.read')){const {section,...rest}=query;redirect(`/ready-to-wear${queryString(section==='collections'?{...rest,section}:rest)}`);}
  if((await params).role!==staff.role)redirect(`/office/${staff.role}${queryString(query)}`);
  return <OfficeWorkspace searchParams={Promise.resolve(query)}/>;
}
