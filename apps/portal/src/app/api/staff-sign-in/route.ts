import {NextResponse} from 'next/server';
import {POST as authenticate} from '../staff-auth/[action]/route';
import {readSignInForm} from '@/lib/staff-sign-in-form';
import {sameOrigin} from '@/lib/request-security';

export const runtime = 'nodejs';

// Native POST fallback also works before the client-side form has hydrated.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({message: 'Open the staff sign-in page to continue.'}, {status: 403});
  const origin = request.headers.get('origin')!;
  let destination: 'office' | 'studio' = 'office';
  const failure = (status: number) => {
    const url = new URL('/staff/sign-in', origin);
    url.searchParams.set('next', destination);
    url.searchParams.set('error', String(status));
    return NextResponse.redirect(url, {status: 303, headers: {'Cache-Control': 'no-store'}});
  };
  try {
    const form = await readSignInForm(request);
    destination = form.destination;
    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/json');
    headers.delete('Content-Length');
    const result = await authenticate(new Request(new URL('/api/staff-auth/login', request.url), {
      method: 'POST', headers, body: JSON.stringify({email: form.email, password: form.password}),
    }), {params: Promise.resolve({action: 'login'})});
    if (!result.ok) return failure(result.status);
    const {staff} = await result.json();
    const target = destination === 'studio' ? staff.studioHref : staff.officeHref;
    const response = NextResponse.redirect(new URL(target, origin), {
      status: 303, headers: {'Cache-Control': 'no-store'},
    });
    for (const cookie of result.cookies.getAll()) response.cookies.set(cookie);
    return response;
  } catch {
    return failure(503);
  }
}
