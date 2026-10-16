import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de parcours (lecture seule : aucun formulaire n'est envoyé, rien n'est écrit en base).
 * Par défaut sur le site en ligne ; autre cible : BASE_URL=http://localhost:3000 npm run test:e2e
 * Lancer : npm run test:e2e   ·   Rapport : npx playwright show-report
 */
const executablePath = process.env["PW_CHROMIUM_PATH"];

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env["BASE_URL"] ?? "https://zen-admin-haven.vercel.app",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], ...(executablePath ? { launchOptions: { executablePath } } : {}) } },
    { name: "telephone", use: { ...devices["Pixel 7"], ...(executablePath ? { launchOptions: { executablePath } } : {}) } },
  ],
});
