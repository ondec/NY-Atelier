import {redirect} from 'next/navigation';
import {currentStaff} from '@/lib/staff-session';
import StaffSignIn from './sign-in';
import {signInError} from '@/lib/staff-sign-in-form';
import {headers} from 'next/headers';
import {workspaceForHost} from '@/lib/workspace-hosts';
export async function generateMetadata({searchParams}:{searchParams:Promise<{next?:string}>}){const query=await searchParams;const studio=query.next==='studio'||(!query.next&&workspaceForHost(await headers())==='studio');return {title:'NY Atelier | Staff sign in',manifest:studio?'/studio.webmanifest':'/office.webmanifest',appleWebApp:{capable:true,title:studio?'NY Studio':'NY Workspace',statusBarStyle:'default' as const}};}
export default async function StaffSignInPage({searchParams}:{searchParams:Promise<{next?:string;error?:string;email?:string;password?:string}>}){const query=await searchParams;const next=query.next==='studio'?'studio':query.next==='office'?'office':workspaceForHost(await headers());if(query.email!==undefined||query.password!==undefined)redirect(`/staff/sign-in?next=${next}`);const staff=await currentStaff();if(staff)redirect(next==='studio'?(staff.studioHref??'/showroom'):staff.officeHref);return <StaffSignIn destination={next} initialError={query.error?signInError(Number(query.error)):undefined}/>;}
