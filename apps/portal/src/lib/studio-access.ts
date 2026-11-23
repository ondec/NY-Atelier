import { can } from './staff-permissions';
import { readStaff } from './staff-session';
export async function studioAuthorized(request:Request){return can(await readStaff(request),'studio');}
/** Ready-to-Wear catalogue and sales need the sales permission, not just Studio access. */
export async function studioSalesError(request:Request,headers:HeadersInit){
  const staff=await readStaff(request);
  if(!can(staff,'studio'))return Response.json({message:'Sign in with your staff account.'},{status:401,headers});
  if(!can(staff,'sales'))return Response.json({message:'Ready-to-Wear sales are not available for your staff role.'},{status:403,headers});
  return null;
}
export async function canManageCatalogue(request:Request){return can(await readStaff(request),'catalogue.manage');}
export function studioCors(request:Request):HeadersInit {void request;return {'Cache-Control':'no-store','Vary':'Cookie'};}
export { sameOrigin as studioSameOrigin } from './request-security';
export async function studioJson(request:Request,limit=65536){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('Expected JSON');
  const reader=request.body?.getReader();if(!reader)throw new Error('Missing data');
  const chunks:Uint8Array[]=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Error('Data too large');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
