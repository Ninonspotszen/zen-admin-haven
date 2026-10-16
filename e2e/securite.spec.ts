import { test, expect } from "@playwright/test";

/** Ce qui doit rester fermé sans connexion. */

test("la bibliothèque renvoie vers la connexion", async ({ page }) => {
  await page.goto("/bibliotheque");
  await expect(page).toHaveURL(/\/connexion/);
});

test("l'admin renvoie vers la page d'authentification", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/auth/);
});

test("un spot inexistant affiche un message clair", async ({ page }) => {
  await page.goto("/spots/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText(/Spot indisponible/i)).toBeVisible();
});

test("le robot du matin refuse un appel sans clé", async ({ request }) => {
  const r = await request.get("/api/public/cron/quotidien");
  expect([401, 500]).toContain(r.status()); // 401 sans clé ; 500 seulement si CRON_SECRET n'est pas configuré
  expect(r.status()).not.toBe(200);
});

test("le webhook Stripe refuse un appel sans signature", async ({ request }) => {
  const r = await request.post("/api/public/stripe-webhook", { data: "{}" });
  expect(r.status()).toBe(400);
});
