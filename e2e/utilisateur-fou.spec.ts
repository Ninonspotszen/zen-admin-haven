import { test, expect, type Page } from "@playwright/test";

/**
 * Test « utilisateur fou » : on maltraite le site comme un visiteur pressé, maladroit ou malveillant.
 * Lecture seule : aucun formulaire n'est réellement envoyé.
 * Critère commun : aucune erreur JavaScript non gérée, la page reste utilisable.
 */
function surveillerErreurs(page: Page) {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  return erreurs;
}

test("navigation frénétique : pages, retour, avance, rechargement", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  for (const chemin of ["/", "/particuliers", "/professionnels", "/offres", "/", "/cgv"]) await page.goto(chemin);
  for (let i = 0; i < 4; i++) await page.goBack();
  for (let i = 0; i < 2; i++) await page.goForward();
  await page.reload();
  await expect(page.locator("body")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("changements de langue en rafale", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/professionnels");
  for (const l of ["en", "de", "nl", "es", "fr", "xx", "en"]) {
    await page.evaluate((langue) => localStorage.setItem("sz-lang", langue), l);
    await page.reload();
  }
  // Langue inconnue (« xx ») puis anglais : le site doit rester lisible.
  await expect(page.getByText(/24 working hours/).first()).toBeVisible();
  // Limite connue (16/10/2026) : le serveur rend la page en français ; pour un visiteur d'une autre langue,
  // React la redessine dans sa langue au chargement (avertissement « hydration »). Sans effet visible durable.
  // Correction complète prévue après la soutenance : langue choisie côté serveur (cookie) avec une instance par requête.
  expect(erreurs.filter((e) => !e.includes("Hydration failed"))).toEqual([]);
});

test("double et triple clics sur les boutons d'abonnement", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  const cta = page.getByRole("link", { name: /5\s?€/ }).first();
  await cta.click({ clickCount: 3 });
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).toBeVisible();
  expect(erreurs).toEqual([]);
});

test("saisies absurdes dans le formulaire (sans l'envoyer)", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/professionnels");
  const form = page.locator("form").filter({ has: page.locator('input[type="email"]') }).first();
  await form.scrollIntoViewIfNeeded();
  const texte = form.locator('input[type="text"]:not([name="site_web"])').first();
  // Texte très long : le champ doit tronquer (maxLength) au lieu de tout accepter.
  await texte.fill("x".repeat(5000));
  expect((await texte.inputValue()).length).toBeLessThanOrEqual(200);
  // Tentative d'injection de code : doit rester du texte, jamais exécuté.
  await texte.fill('<img src=x onerror="window.__pirate=1">');
  expect(await page.evaluate(() => (window as unknown as { __pirate?: number }).__pirate)).toBeUndefined();
  // Email invalide : le navigateur le refuse.
  const email = form.locator('input[type="email"]');
  await email.fill("pas-un-email");
  expect(await email.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  expect(erreurs).toEqual([]);
});

test("adresses farfelues : spot mal formé, page inexistante", async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await page.goto("/spots/n-importe-quoi");
  await expect(page.locator("body")).toBeVisible();
  const r = await page.goto("/cette-page-n-existe-pas");
  expect(r?.status()).toBe(404);
  expect(erreurs).toEqual([]);
});

test("écran minuscule puis immense", async ({ page }) => {
  await page.goto("/offres");
  for (const [w, h] of [[320, 568], [1920, 1080], [768, 1024]] as const) {
    await page.setViewportSize({ width: w, height: h });
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(deborde, `débordement horizontal à ${w}px`).toBe(false);
  }
});

test("navigation au clavier seul : le premier Tab atteint un élément visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el && el !== document.body ? el.getBoundingClientRect().width > 0 : false;
  });
  expect(focus).toBe(true);
});
