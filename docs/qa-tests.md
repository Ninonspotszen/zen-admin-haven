# Tests automatiques et test « utilisateur fou » — Spots Zen

*16/10/2026 — outil : Playwright 1.64.1 (skill et CLI installés, cf. `.claude/skills/playwright-cli`).*

## Lancer les tests

```bash
npm run test:e2e                              # sur le site en ligne (lecture seule)
BASE_URL=http://localhost:3000 npm run test:e2e  # sur une copie locale
npx playwright show-report                    # rapport HTML avec captures en cas d'échec
npm test                                      # tests unitaires (robot des emails)
```

Chaque test tourne deux fois : **ordinateur** (Chrome) et **téléphone** (Pixel 7). Aucun test n'envoie de formulaire ni n'écrit en base.

## Ce qui est couvert (22 tests × 2 écrans = 44 passages, + 2 tests unitaires)

| Fichier | Parcours |
|---|---|
| `e2e/parcours-public.spec.ts` | accueil et bouton d'abonnement, page Offres (5 € / 49 €), formulaire Professionnels (email obligatoire, case de refus, « 24 heures ouvrées », champ piège invisible, aucun envoi à vide), passage en anglais, 5 pages légales, pas de défilement horizontal |
| `e2e/securite.spec.ts` | bibliothèque → connexion, admin → authentification, spot inexistant, robot du matin sans clé refusé, webhook Stripe sans signature refusé |
| `e2e/utilisateur-fou.spec.ts` | navigation frénétique (pages, retour, avance, rechargement), langues en rafale dont une inconnue, triple clic sur l'abonnement, texte de 5 000 caractères, tentative d'injection de code, email invalide, adresses farfelues (404), écran de 320 px à 1 920 px, navigation au clavier |
| `src/lib/emails-auto.test.ts` | robot des emails : bon email à la bonne personne, jamais deux fois, bonne langue, simulation sans envoi |

Résultat du 16/10/2026 sur copie locale : **tous les tests passent**.

## Ce que les tests ont trouvé (et corrigé)

1. **Le site était rendu en anglais par le serveur** (langue de secours), puis réécrit en français dans le navigateur : erreur d'hydratation React à chaque visite, page redessinée, et **Google voyait le titre et le texte en anglais**. Corrigé : le serveur rend en français (`src/i18n/index.ts`).
   *Limite restante* : un visiteur d'une autre langue voit la page redessinée dans sa langue au chargement (avertissement technique, sans effet durable). Correction complète prévue après la soutenance (langue choisie côté serveur).
2. **Bibliothèque : l'immersion recommandée ne suivait pas le moment de la journée** (repéré par Ninon le 16/10 au matin) : le catalogue de la bibliothèque n'avait pas les recommandations des spots. Corrigé.
3. **Code PIN sans limite de tentatives** et **formulaires publics sans limite de fréquence** (revue de code) : corrigés (20 codes faux / 10 min par spot ; 5 et 3 demandes / heure par connexion).

## Tests à faire à la main (téléphone de Ninon)

- [ ] iPhone : connexion par code, lecture d'un audio écran verrouillé, ajout à l'écran d'accueil
- [ ] Spot avec PIN : mauvais code → « Code incorrect » ; bon code → bibliothèque
- [ ] Coupure du réseau pendant une écoute (mode avion) puis retour
- [ ] Paiement Stripe réel puis résiliation (jour du lancement)
