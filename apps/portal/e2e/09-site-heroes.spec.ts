import { expect, test } from "@playwright/test";
import { API, signedIn } from "./helpers";

/** Catalogue manager: Save keeps a hero as a draft (not public); Publish puts it live. Puts the RTW hero back after. */
test("site hero Save is private, Publish goes live", async ({ browser, request }) => {
  const heading = `E2E heading ${Date.now()}`;
  const publicText = async () => (await request.get(`${API}/api/shop/catalogue`)).text();
  const { page, context } = await signedIn(browser, "catalogue");
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/ready-to-wear?section=heroes");
  await page.getByRole("tab", { name: /RTW Store/ }).click();
  const featured = await page.getByRole("radiogroup", { name: "Collection to feature" }).getByRole("radio", { checked: true }).textContent();
  await page.getByRole("radio", { name: /Photos or video/ }).check();
  await page.getByLabel("Add a photo by link").fill("https://example.com/e2e-hero.jpg");
  await page.getByLabel("Add a photo by link").press("Enter");
  await page.getByRole("textbox", { name: /^Heading/ }).fill(heading);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.waitForTimeout(2500);
  expect(await publicText(), "a saved draft must not be public").not.toContain(heading);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect.poll(publicText, { timeout: 15000, message: "published hero is public" }).toContain(heading);
  // Put the featured collection back.
  await page.getByRole("radio", { name: /Featured collection/ }).check();
  if (featured) await page.getByRole("radio", { name: new RegExp(featured.split("Launch")[0].split(/\d+ photo/)[0].trim().replace(/[()]/g, "\\$&")) }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect.poll(publicText, { timeout: 15000 }).not.toContain(heading);
  await context.close();
});
