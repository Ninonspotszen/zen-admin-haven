import { test, expect } from "@playwright/test";

/** Parcours d'un visiteur sans compte. Aucun envoi de formulaire. */

test("l'accueil s'affiche et mène vers l'abonnement", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Spots Zen/i);
  const cta = page.getByRole("link", { name: /5\s?€/ }).first();
  await expect(cta).toBeVisible();
});

test("la page Offres affiche les deux formules", async ({ page }) => {
  await page.goto("/offres");
  await expect(page.getByText(/5\s?€/).first()).toBeVisible();
  await expect(page.getByText(/49\s?€/).first()).toBeVisible();
});

test("formulaire Professionnels : email obligatoire, case de refus, délai en heures ouvrées", async ({ page }) => {
  await page.goto("/professionnels");
  await expect(page.getByText(/24 heures ouvrées/).first()).toBeVisible();
  const formulaire = page.locator("form").filter({ has: page.locator('input[type="email"]') }).first();
  await formulaire.scrollIntoViewIfNeeded();
  await expect(formulaire.locator('input[name="refus_actualites"]')).toBeVisible();
  // Envoi à vide : le navigateur bloque (champ email requis), aucune requête ne part.
  let requeteEnvoyee = false;
  page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("_serverFn")) requeteEnvoyee = true; });
  await formulaire.locator('button[type="submit"]').click();
  const valide = await formulaire.locator('input[type="email"]').evaluate((el: HTMLInputElement) => el.validity.valid);
  expect(valide).toBe(false);
  expect(requeteEnvoyee).toBe(false);
  // Le champ piège anti-robots est invisible.
  await expect(formulaire.locator('input[name="site_web"]')).not.toBeInViewport();
});

test("le site passe en anglais", async ({ page }) => {
  await page.goto("/professionnels");
  await page.evaluate(() => localStorage.setItem("sz-lang", "en"));
  await page.reload();
  await expect(page.getByText(/24 working hours/).first()).toBeVisible();
});

for (const [chemin, titre] of [
  ["/politique-confidentialite", /confidentialit/i],
  ["/politique-cookies", /cookies/i],
  ["/cgv", /conditions/i],
  ["/cgu", /conditions/i],
  ["/mentions-legales", /mentions/i],
] as const) {
  test(`page légale ${chemin}`, async ({ page }) => {
    const reponse = await page.goto(chemin);
    expect(reponse?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading").first()).toContainText(titre);
  });
}

test("pas de défilement horizontal sur l'accueil", async ({ page }) => {
  await page.goto("/");
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(deborde).toBe(false);
});
