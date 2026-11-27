import OfficeWorkspace from '../office-workspace';
import {requireStaff} from '@/lib/staff-session';
import {can} from '@/lib/staff-permissions';
import {WorkspaceLink} from '../web-app';
export const dynamic='force-dynamic';

/** Ready-to-Wear: finished-garment stock, products and collections, opened from the workspace rail. */
export default async function ReadyToWearPage({searchParams}:{searchParams:Parameters<typeof OfficeWorkspace>[0]['searchParams']}){
  const staff=await requireStaff();
  if(!can(staff,'catalogue.manage'))return <main className="staff-access-denied"><h1>Ready-to-Wear access restricted.</h1><p>You don’t have permission to manage the Ready-to-Wear catalogue. Contact your administrator if you need access.</p><WorkspaceLink href={staff.officeHref}>Go to your workspace</WorkspaceLink></main>;
  const query=await searchParams;
  return <OfficeWorkspace searchParams={Promise.resolve({...query,section:query.section==='collections'?'collections':'inventory'})}/>;
}
