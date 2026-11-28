import { defineConfig } from "@playwright/test";

/** Local end-to-end tests: every role in its own browser, against the running local portal (3000) and API (8000). */
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "e2e-report", open: "never" }]],
  use: { baseURL: "http://localhost:3000", screenshot: "on", trace: "retain-on-failure", viewport: { width: 1280, height: 800 } },
  outputDir: "e2e-results",
});
