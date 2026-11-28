import { expect, test } from "@playwright/test";
import { api, emailCode, emailReplyLink, password, signedIn, testCustomer } from "./helpers";

const WEBSITE = "http://localhost:5173";
const stamp = Date.now().toString().slice(-6);
const customer = { name: `E2E Abena ${stamp}`, email: `e2e.abena.${stamp}@example.test`, phone: `+23324${stamp}0`.slice(0, 13) };

/** The customer's side: book on the website, the team answers, sign in with a code, answer suggested times. */
test.describe("Customer on the website", () => {
  test("1. Website: book an appointment like a visitor", async ({ page }) => {
    await page.goto(`${WEBSITE}/appointment#book`);
    const form = page.locator("form.cx-form");
    await form.getByRole("group", { name: /Preferred day/ }).getByRole("button").nth(2).click();
    await form.getByRole("group", { name: /Preferred time/ }).getByRole("button").nth(2).click();
    await form.getByLabel(/FULL NAME/).fill(customer.name);
    await form.getByLabel(/EMAIL ADDRESS/).fill(customer.email);
    await form.getByLabel(/PHONE NUMBER/).fill(customer.phone);
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: /SEND APPOINTMENT REQUEST/ }).click();
    await expect(form.getByRole("button", { name: /REQUEST SENT/ })).toBeVisible();
    await page.screenshot({ path: "e2e-results/customer-booked.png", fullPage: true });
  });

  test("2. Operations suggests times on the website request; the guest picks one from the email", async ({ browser, page }) => {
    const { page: office, context } = await signedIn(browser, "operations");
    await office.goto("/?section=appointments");
    await office.getByPlaceholder(/Search customer/).fill(customer.name);
    await office.getByRole("row", { name: new RegExp(customer.name) }).getByRole("button", { name: /View consultation/ }).click();
    await expect(office.getByRole("button", { name: "Confirm requested time" })).toBeVisible();
    await office.getByRole("button", { name: "Suggest new times" }).click();
    const inTwoWeeks = new Date(Date.now() + 16 * 864e5).toISOString().slice(0, 10);
    for (const [index, time] of ["10:00", "15:30"].entries()) {
      await office.getByLabel(`Date ${index + 1}`).fill(inTwoWeeks);
      await office.getByLabel(`Time ${index + 1}`).fill(time);
    }
    await office.getByRole("button", { name: "Send suggested times" }).click();
    await expect(office.getByRole("heading", { name: /awaiting customer/i })).toBeVisible();
    await office.screenshot({ path: "e2e-results/staff-appointment.png", fullPage: true });
    await context.close();

    // The guest opens the emailed link (no sign-in) and picks the second time.
    const link = new URL(emailReplyLink(customer.email));
    await page.goto(`${WEBSITE}${link.pathname}${link.search}`);
    await expect(page.getByRole("heading", { name: /Choose a time/ })).toBeVisible();
    await page.getByRole("button", { name: /at 15:30/ }).click();
    await expect(page.getByRole("heading", { name: /booked/ })).toBeVisible();
    await page.screenshot({ path: "e2e-results/guest-picked-time.png", fullPage: true });
    // A changed link is refused.
    await page.goto(`${WEBSITE}${link.pathname}${link.search.replace(/token=./, "token=0")}`);
    await expect(page.getByRole("heading", { name: /not valid/ })).toBeVisible();
  });

  test("3. Website and store show Sign in in the header", async ({ page }) => {
    for (const site of [WEBSITE, "http://localhost:5174"]) {
      await page.goto(site);
      await expect(page.getByRole("link", { name: /sign in|account/i }).first(), `customer sign-in on ${site}`).toBeVisible({ timeout: 5000 });
    }
  });

  test("4. Customer signs in with an email code, books, and picks a time the team suggests", async ({ page }) => {
    const email = `e2e.account.${stamp}@example.test`;
    await page.goto(`${WEBSITE}/account`);
    await page.getByLabel("EMAIL ADDRESS").fill(email);
    await page.getByRole("button", { name: "EMAIL ME A CODE" }).click();
    await expect(page.getByText(/We sent a 6-digit code/)).toBeVisible();
    // A wrong code is refused.
    await page.getByLabel("CODE").fill("000000");
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await expect(page.getByRole("alert")).toContainText(/not right|expired/);
    await page.getByLabel("CODE").fill(emailCode(email));
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    await page.getByLabel("YOUR NAME").fill(`E2E Account ${stamp}`);
    await page.getByRole("button", { name: "SAVE" }).click();
    await expect(page.getByRole("heading", { name: /Hello, E2E/ })).toBeVisible();

    // Book while signed in: no contact fields, the request joins the account.
    await page.goto(`${WEBSITE}/appointment#book`);
    const form = page.locator("form.cx-form");
    await expect(form.getByText(/Booking as/)).toBeVisible();
    await form.getByRole("group", { name: /Preferred day/ }).getByRole("button").nth(3).click();
    await form.getByRole("group", { name: /Preferred time/ }).getByRole("button").nth(1).click();
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: /SEND APPOINTMENT REQUEST/ }).click();
    await expect(form.getByRole("button", { name: /REQUEST SENT/ })).toBeVisible();

    await page.goto(`${WEBSITE}/account`);
    await expect(page.getByText("Waiting for the team")).toBeVisible();
    const [booking] = await (await page.request.get(`${WEBSITE}/api/account/appointments`)).json();

    // The team suggests two times (staff side through the API).
    const staff = await api("operations");
    const suggested = await staff.patch(`/api/demo/consultations/${booking.id}/staff`, { data: { action: "propose", version: booking.version, options: [{ date: booking.preferredDate, time: "10:00" }, { date: booking.preferredDate, time: "15:00" }] } });
    expect(suggested.ok(), await suggested.text()).toBeTruthy();

    await page.reload();
    await expect(page.getByText("Choose a time")).toBeVisible();
    await page.getByRole("button", { name: /at 15:00/ }).click();
    await expect(page.getByText("Confirmed")).toBeVisible();
    await page.screenshot({ path: "e2e-results/customer-account.png", fullPage: true });

    await page.getByRole("button", { name: "SIGN OUT" }).click();
    await expect(page.getByRole("heading", { name: /Sign in/ })).toBeVisible();
    expect((await page.request.get(`${WEBSITE}/api/account/me`)).status()).toBe(401);
  });

  test("5. Test customer signs in with a password; a wrong one is refused", async ({ page }) => {
    await page.goto(`${WEBSITE}/account`);
    await page.getByRole("button", { name: "Use my password instead" }).click();
    await page.getByLabel("EMAIL ADDRESS").fill(testCustomer);
    await page.getByLabel("PASSWORD").fill("not-the-password-1");
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await expect(page.getByRole("alert")).toContainText("do not match");
    await page.getByLabel("PASSWORD").fill(password);
    await page.getByRole("button", { name: "SIGN IN" }).click();
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    // The store's account icon leads to the same signed-in account.
    await page.goto("http://localhost:5173/shop/");
    await page.getByRole("link", { name: /account/i }).first().click();
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    await page.getByRole("button", { name: "SIGN OUT" }).click();
  });
});
