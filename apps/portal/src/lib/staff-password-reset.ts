export function readStaffResetLink(hash: string) {
  const values = new URLSearchParams(hash.replace(/^#/, ''));
  const token = values.get('token') ?? '';
  const email = values.get('email') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token) || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return {token, email};
}
