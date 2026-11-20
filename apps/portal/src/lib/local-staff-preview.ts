export function isLocalStaffPreview(headers: Pick<Headers, "get">) {
  const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
  const forwarded = headers.get("x-forwarded-host");
  return loopback.test(headers.get("host") ?? "") && (!forwarded || loopback.test(forwarded));
}
