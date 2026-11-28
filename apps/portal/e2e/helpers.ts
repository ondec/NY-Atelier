import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Browser, type BrowserContext, type Page, request as apiRequest } from "@playwright/test";

/** Local test logins come from LOCAL_TEST_LOGINS.md beside the codebase (never committed). */
const logins = readFileSync(resolve(__dirname, "../../../../LOCAL_TEST_LOGINS.md"), "utf8");
export const password = process.env.E2E_PASSWORD ?? logins.match(/local password: (\S+)/)?.[1] ?? "";
const emailFor = (label: string) => {
  const row = logins.split("\n").find((line) => line.startsWith(`| ${label} |`));
  const email = row?.split("|")[2]?.trim();
  if (!email) throw new Error(`No local login for ${label}`);
  return email;
};
export const roles = {
  owner: emailFor("Owner"), manager: emailFor("General manager"), operations: emailFor("Operations manager"),
  rtwReception: emailFor("Receptionist (RTW store)"), atelierReception: emailFor("Receptionist (bespoke atelier)"),
  production: emailFor("Production manager"), tailor: emailFor("Tailor"), courier: emailFor("Delivery courier"), catalogue: emailFor("Catalogue manager"),
} as const;
export type Role = keyof typeof roles;
/** The local test customer (website account, same local password). */
export const testCustomer = emailFor("Customer (website)");
export const API = "http://localhost:8000";

/** A browser window signed in as one role (its own cookies), like a separate person on their own device. */
const sessions = new Map<Role, Awaited<ReturnType<BrowserContext["storageState"]>>>();
export async function signedIn(browser: Browser, role: Role, destination: "office" | "studio" = "office"): Promise<{ context: BrowserContext; page: Page }> {
  // Each role signs in once per run (sign-in is rate limited); later windows reuse its cookies.
  const saved = sessions.get(role);
  const context = await browser.newContext({ baseURL: "http://localhost:3000", ...(saved ? { storageState: saved } : {}) });
  const page = await context.newPage();
  if (saved) return { context, page };
  const response = await page.request.post("/api/staff-sign-in", {
    form: { email: roles[role], password, destination }, headers: { Origin: "http://localhost:3000" }, maxRedirects: 0,
  });
  expect(response.status(), `${role} sign-in`).toBe(303);
  expect(response.headers().location ?? "", `${role} sign-in redirect`).not.toContain("error=");
  sessions.set(role, await context.storageState());
  return { context, page };
}

/** Direct API access as a role (for setting up data quickly; the actions under test happen in the browser). */
const tokens = new Map<Role, string>();
export async function api(role: Role) {
  const cached = tokens.get(role);
  if (cached) return apiRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: "application/json", Authorization: `Bearer ${cached}` } });
  const context = await apiRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: "application/json" } });
  const login = await context.post("/api/staff/auth/login", { data: { email: roles[role], password } });
  expect(login.ok(), `${role} API sign-in`).toBeTruthy();
  const { token } = await login.json();
  tokens.set(role, token);
  return apiRequest.newContext({ baseURL: API, extraHTTPHeaders: { Accept: "application/json", Authorization: `Bearer ${token}` } });
}

export const uuid = () => crypto.randomUUID();

/** Sells an in-stock ready-to-wear piece through the Studio sale desk API (simulated payment). Returns the order reference. */
export async function rtwSale(role: Role, handover: "delivery" | "collection" | "take-away") {
  const client = await api(role);
  const catalogue = await (await client.get("/api/demo/staff/studio/catalogue")).json();
  const variant = catalogue.inventory.variants.find((row: { quantity: number }) => row.quantity > 1);
  expect(variant, "an in-stock variant").toBeTruthy();
  const customers = await (await client.get("/api/demo/staff/customers")).json();
  const customer = customers.customers[0];
  const lines = [{ variantId: variant.id, quantity: 1 }];
  const quote = await (await client.post("/api/demo/staff/studio/sales/quote", { data: { customer_id: customer.id, lines } })).json();
  const sale = await client.post("/api/demo/staff/studio/sales", { data: {
    request_id: uuid(), customer_id: customer.id, lines, revision: quote.revision, total_minor: quote.total_minor,
    payment_method: "mobile-money", payment_reference: `E2E-${Date.now()}`, payment_confirmed: true, handover,
    handover_confirmed: handover === "take-away", instructions: handover === "delivery" ? "Haatso, Accra · E2E test" : undefined,
  } });
  expect(sale.ok(), `sale: ${await sale.text()}`).toBeTruthy();
  const body = await sale.json();
  const reference: string = body.receipt?.reference ?? body.reference;
  expect(reference, `order reference in ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
  return { reference, customer };
}

/** The latest sign-in code emailed to this address (local mail goes to the API's laravel.log). */
export function emailCode(email: string): string {
  const log = readFileSync(resolve(__dirname, "../../api/storage/logs/laravel.log"), "utf8");
  const at = log.lastIndexOf(`To: ${email}`);
  const code = at >= 0 ? log.slice(at).match(/>(\d{6})</)?.[1] : undefined;
  if (!code) throw new Error(`No sign-in code emailed to ${email}`);
  return code;
}

/** The latest appointment reply link emailed to this address. */
export function emailReplyLink(email: string): string {
  const log = readFileSync(resolve(__dirname, "../../api/storage/logs/laravel.log"), "utf8");
  const at = log.lastIndexOf(`To: ${email}`);
  const link = at >= 0 ? log.slice(at).match(/https?:\/\/[^\s"'<>]+\/appointment\/reply\?id=[\da-f-]+(?:&amp;|&)token=[a-f0-9]{64}/)?.[0] : undefined;
  if (!link) throw new Error(`No appointment link emailed to ${email}`);
  return link.replace(/&amp;/g, "&");
}
