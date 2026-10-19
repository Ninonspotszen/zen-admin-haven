# Maquettes Spots Zen (Stitch)

Écrans conçus dans **Google Stitch** (septembre 2026), exportés en PNG et archivés ici le 19/10/2026. La palette et la typographie générées par Stitch (thème « Serene Immersion ») sont dans [`DESIGN-stitch.md`](DESIGN-stitch.md).

14 écrans : 8 pour l'application des visiteurs et abonnés (PWA), dont 5 en version claire et sombre, et 6 pour le back-office.

## Application visiteurs et abonnés (PWA)

| Maquette | Fichier(s) | Page construite |
|---|---|---|
| S1 · Accueil d'un spot (exemple : Camping Le Tedey) | [clair](pwa-s1-accueil-spot-clair.png) · [sombre](pwa-s1-accueil-spot-sombre.png) | `/spots/:id` |
| S2 · Lecteur | [clair](pwa-s2-lecteur.png) | lecteur intégré à `/spots/:id` et à `/bibliotheque` |
| B1 · Offres particuliers | [clair](pwa-b1-offres-clair.png) · [sombre](pwa-b1-offres-sombre.png) | `/offres` |
| B2 · Connexion | [sombre](pwa-b2-connexion-sombre.png) | `/connexion` |
| B3 · Mon compte / bibliothèque | [clair](pwa-b3-bibliotheque-clair.png) · [sombre](pwa-b3-bibliotheque-sombre.png) | `/bibliotheque` |

## Back-office (admin)

| Maquette | Fichier | Page construite |
|---|---|---|
| A1 · Tableau de bord | [admin-a1-dashboard.png](admin-a1-dashboard.png) | `/admin` |
| A2 · Clients B2B (vue globale) | [admin-a2-clients-b2b.png](admin-a2-clients-b2b.png) | `/admin/clients` |
| A3 · Détail d'un client B2B | [admin-a3-detail-client-b2b.png](admin-a3-detail-client-b2b.png) | `/admin/clients/:id` |
| A4 · Bibliothèque audio globale | [admin-a4-bibliotheque-audio.png](admin-a4-bibliotheque-audio.png) | `/admin/audios` |
| A5 · Abonnés et ambassadeurs | [admin-a5-abonnes-ambassadeurs.png](admin-a5-abonnes-ambassadeurs.png) | `/admin/abonnes` |
| A6 · Configuration d'un spot | [admin-a6-configuration-spot.png](admin-a6-configuration-spot.png) | `/admin/spots/:id` |

## Écarts entre maquettes et site

- Les maquettes sont le point de départ : textes, prix et fonctions ont évolué pendant la construction (voir la section 9 de la note de cadrage).
- **Mode sombre** : dessiné dans Stitch pour 5 écrans, **pas encore activé sur le site** (reporté après la soutenance ; il sera audité WCAG avant ouverture).
- **Accessibilité** : le site construit a passé l'audit WCAG 2.1 AA ([`../audit-accessibilite.md`](../audit-accessibilite.md)) ; plusieurs couleurs des maquettes ont été assombries pour atteindre les contrastes requis.
- La version claire de l'écran B2 · Connexion n'a pas été exportée correctement par Stitch (fichier vide) : à réexporter.
