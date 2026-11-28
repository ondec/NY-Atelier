// Customer sign-in for the public website and RTW Store. The sites are served by this service, so the
// customer's API token lives in an httpOnly cookie on the site's own address and never reaches page scripts.
// Only the calls listed in accountRoutes are passed to Laravel.
const secure = process.env.NODE_ENV === "production";
export const customerCookie = {
  name: secure ? "__Host-ny_customer" : "ny_customer",
  options: { httpOnly: true, sameSite: "lax" as const, path: "/", secure },
};

export type AccountRoute = { method: string; path: string; signedIn: boolean; signsIn?: boolean; signsOut?: boolean };
const uuid = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;

/** The account call for a path under /api/account/, or null when it is not one we pass on. */
export function accountRoute(path: string[], method: string): AccountRoute | null {
  const key = `${method} ${path.join("/")}`;
  switch (key) {
    case "POST start": return { method, path: "/api/customer/auth/start", signedIn: false };
    case "POST verify": return { method, path: "/api/customer/auth/verify", signedIn: false, signsIn: true };
    case "POST login": return { method, path: "/api/customer/auth/login", signedIn: false, signsIn: true };
    case "GET me": return { method, path: "/api/customer/auth/me", signedIn: true };
    case "PATCH me": return { method, path: "/api/customer/auth/me", signedIn: true };
    case "POST logout": return { method, path: "/api/customer/auth/logout", signedIn: true, signsOut: true };
    case "GET orders": return { method, path: "/api/customer/orders", signedIn: true };
    case "GET appointments": return { method, path: "/api/customer/consultations", signedIn: true };
    case "POST appointments": return { method, path: "/api/customer/consultations", signedIn: true };
  }
  if (method === "PATCH" && path.length === 2 && path[0] === "appointments" && uuid.test(path[1])) {
    return { method, path: `/api/customer/consultations/${path[1]}`, signedIn: true };
  }
  return null;
}

/** Start always uses an email code from the website. */
export function startBody(body: Record<string, unknown>): Record<string, unknown> {
  return { channel: "email", destination: typeof body.email === "string" ? body.email : "", ...(typeof body.password === "string" && body.password ? { password: body.password } : {}) };
}
