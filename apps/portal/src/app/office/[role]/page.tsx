import {redirect} from 'next/navigation';
import OfficeWorkspace from '../../office-workspace';
import {requireStaff} from '@/lib/staff-session';
export const dynamic='force-dynamic';
export default async function OfficePage({params,searchParams}:{params:Promise<{role:string}>;searchParams:Parameters<typeof OfficeWorkspace>[0]['searchParams']}){const staff=await requireStaff();if((await params).role!==staff.role)redirect(`/office/${staff.role}`);return <OfficeWorkspace searchParams={searchParams}/>;}
