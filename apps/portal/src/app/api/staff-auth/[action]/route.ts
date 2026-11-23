import { NextResponse } from 'next/server';
import { readStaff, staffBackendHeaders } from '@/lib/staff-session';
import { studioJson,studioSameOrigin } from '@/lib/studio-access';
import { staffCookieSettings, workspaceLinks } from '@/lib/workspace-hosts';
export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}) {
  if((await params).action!=='session')return NextResponse.json({message:'Unavailable.'},{status:404});
  return NextResponse.json({staff:await readStaff(request)},{headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}) {
  if(!studioSameOrigin(request))return NextResponse.json({message:'Open the staff sign-in page to continue.'},{status:403});
  const {action}=await params;if(!['login','logout','activation','activate','forgot-password','reset-password'].includes(action))return NextResponse.json({message:'Unavailable.'},{status:404});
  const recovery=action==='forgot-password'||action==='reset-password';
  const responseHeaders={'Cache-Control':'no-store'};
  const cookie=staffCookieSettings(request.headers,request.url);
  const clear=(response:NextResponse)=>{response.cookies.set(cookie.name,'',{...cookie.options,maxAge:0});if(cookie.name!=='ny_staff')response.cookies.set('ny_staff','',{httpOnly:true,path:'/',maxAge:0});response.cookies.set('ny_studio','',{httpOnly:true,path:'/',maxAge:0});return response;};
  try {
    const body=action==='logout'?{}:await studioJson(request,8192);
    const result=await fetch(`${process.env.API_BASE_URL??'http://127.0.0.1:8000'}/api/staff/auth/${action}`,{method:'POST',cache:'no-store',headers:recovery?{Accept:'application/json','Content-Type':'application/json'}:await staffBackendHeaders(request),body:JSON.stringify(body),signal:AbortSignal.timeout(recovery?30000:12000)});
    const data=await result.json();
    if(action==='logout')return clear(NextResponse.json({signedOut:true},{headers:{'Cache-Control':'no-store'}}));
    if(!result.ok)return NextResponse.json({message:data.message??(recovery?'Could not reset your password.':'Could not sign in.')},{status:result.status,headers:responseHeaders});
    if(recovery){const response=NextResponse.json({message:data.message},{headers:responseHeaders});return action==='reset-password'?clear(response):response;}
    const response=NextResponse.json({staff:data.staff?{...data.staff,...workspaceLinks(request.headers,data.staff.role)}:undefined,...(action==='activation'?data:{})},{headers:{'Cache-Control':'no-store'}});
    if(data.token){response.cookies.set(cookie.name,Buffer.from(data.token).toString('base64url'),cookie.options);if(cookie.name!=='ny_staff')response.cookies.set('ny_staff','',{httpOnly:true,path:'/',maxAge:0});response.cookies.set('ny_studio','',{httpOnly:true,path:'/',maxAge:0});}
    return response;
  }catch{if(action==='logout')return clear(NextResponse.json({signedOut:true},{headers:{'Cache-Control':'no-store'}}));return NextResponse.json({message:recovery?'Password reset is temporarily unavailable. Please try again.':'Staff sign-in is temporarily unavailable. Please try again.'},{status:503,headers:responseHeaders});}
}
