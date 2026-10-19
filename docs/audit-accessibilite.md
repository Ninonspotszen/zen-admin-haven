# Audit d'accessibilité (WCAG 2.1 AA) — Spots Zen

*Réalisé le 19/10/2026 avec Claude Code, dans le dépôt.*
*Outil : **axe-core 4.10** (Deque, référence du marché) piloté par Playwright, règles WCAG 2.0/2.1 niveaux A et AA, sur ordinateur (1280 px) et téléphone (390 px), complété par un parcours au clavier.*

## 1. Pages contrôlées

Accueil `/` · Particuliers `/particuliers` · Professionnels `/professionnels` · Offres `/offres` · Connexion `/connexion` · Mentions légales `/mentions-legales` · Page d'un spot `/spots/:id`.
La bibliothèque et le back-office demandent une connexion : leurs couleurs reprennent les mêmes jetons (`#1C2E1E` sur `#F8F6F2`, `#5A6B5C` pour le texte secondaire, contrôlés ci-dessous).

## 2. Résultat

| | Avant | Après corrections |
|---|---|---|
| Violations axe (WCAG A + AA) | **55 éléments** sur 7 pages, uniquement des **contrastes** | **0** |
| Autres règles (titres, libellés de formulaire, textes alternatifs, langue, rôles ARIA…) | conformes | conformes |

## 3. Corrections faites

| Élément | Problème | Avant | Correction | Après |
|---|---|---|---|---|
| Pied de page légal (offres, connexion, spot, bibliothèque) | texte grisé par une opacité de 70 % | 2,9:1 à 3,2:1 | opacité retirée, couleur secondaire de la charte | 5,3:1 à 6,1:1 |
| Sélecteur de langue (FR · EN · DE · NL · ES), langues inactives | opacité 50 % | 2,6:1 | opacité 90 % (la langue active reste soulignée) | ≥ 4,5:1 |
| Petits numéros dorés de l'accueil (01, 02…) | or clair `#C4B89D` sur blanc | 1,96:1 | nouvel or foncé `#7D6F4D` pour les textes ; l'or clair reste pour les décors | 4,9:1 |
| Pastille « MEILLEURE OFFRE » (Particuliers) | blanc sur vert olive `#8B9467` | 3,2:1 | olive assombri `#6B7449` | 5,0:1 |
| Date « Dernière mise à jour » des pages légales | gris `#718096` | 4,0:1 | `#5A6B5C` | 5,7:1 |
| Questions de la FAQ (Particuliers) | aucun repère visible au clavier | — | contour vert 2 px au focus clavier | visible |
| Champs email et code (Connexion) | repère clavier limité à la bordure | — | anneau vert ajouté au focus clavier | visible |

## 4. Navigation au clavier

Parcours de 25 tabulations par page : tous les liens, boutons et champs sont atteignables dans l'ordre de lecture, avec un repère visible (après les corrections ci-dessus). Le test automatique `e2e/utilisateur-fou.spec.ts` vérifie aussi que la première tabulation atteint un élément visible.

## 5. Points vérifiés à la main (faux positifs de l'outil)

- **Titre de l'accueil sur la photo** : axe lit « blanc sur blanc » car il ne voit pas le voile sombre posé sous le texte (calque en `z-index` négatif). Calcul dans le pire cas (voile `#1C2F3B` à 73 %, sans photo) : **5,6:1**, conforme. Avec la photo, le contraste est plus élevé.
- **Vignette vidéo de l'accueil** signalée « hors écran » : l'image n'était pas chargée dans l'environnement de test (stockage externe bloqué) ; en production elle a sa taille normale.

## 6. Limites et suite

- Le **mode sombre** existe dans les styles mais **aucun bouton ne l'active** : il n'est donc pas visible des utilisateurs et n'a pas été audité. À auditer avant de l'ouvrir.
- Audit automatique : il couvre environ un tiers à la moitié des critères WCAG. Un test avec un lecteur d'écran (VoiceOver sur iPhone, TalkBack sur Android) reste à faire.
- Le lecteur audio (page spot et bibliothèque) demande des données réelles : à contrôler sur www.spotszen.fr avec l'extension axe DevTools.
