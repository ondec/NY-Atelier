export function signInError(status: number) {
  if (status === 401) return 'The email or password is incorrect, or staff access is unavailable.';
  if (status === 429) return 'Too many sign-in attempts. Please try again in a minute.';
  if (status === 422) return 'Enter a valid staff email and password.';
  return 'Staff sign-in is temporarily unavailable. Please try again.';
}

export async function readSignInForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) {
    throw new Error('Expected a sign-in form.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing sign-in form.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8192) {
      await reader.cancel();
      throw new Error('Sign-in form too large.');
    }
    chunks.push(value);
  }
  const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
  return {
    email: form.get('email') ?? '',
    password: form.get('password') ?? '',
    destination: form.get('next') === 'studio' ? 'studio' as const : 'office' as const,
  };
}
