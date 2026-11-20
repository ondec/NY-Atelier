export function tokenFromCookie(cookie:string|null):string|undefined {
  const value=cookie?.match(/(?:^|;\s*)__Secure-ny_staff=([A-Za-z0-9_-]{1,700})(?:;|$)/)?.[1] ?? cookie?.match(/(?:^|;\s*)ny_staff=([A-Za-z0-9_-]{1,700})(?:;|$)/)?.[1];
  if(!value)return;
  const token=Buffer.from(value,'base64url').toString('utf8');
  return /^\d+\|[A-Za-z0-9_-]{40,200}$/.test(token)?token:undefined;
}
