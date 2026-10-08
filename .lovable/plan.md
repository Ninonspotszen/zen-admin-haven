# S1 — Fiche Spot PWA (/spots/$id)

Périmètre strict : uniquement la nouvelle route `/spots/$id` et ses composants dédiés. Aucun écran admin modifié.

## Ce que le visiteur verra
1. **Chargement** : fond sable, logo centré, cartes grises qui pulsent.
2. **Spot inactif** : logo + « Ce spot n'est pas disponible pour le moment. », sans bouton.
3. **Code PIN** (si renseigné) : 4 cases chiffres, message « Code incorrect. Vérifiez l'affichette. », tentatives illimitées sans blocage (3 messages puis on continue).
4. **Mode email_domaine** : redirection vers `/spots/$id/acces` (page simple « bientôt disponible » pour l'instant, à construire plus tard).
5. **En-tête** : logo clair/sombre, sélecteur FR · EN · DE · NL · ES (langue du téléphone, mémorisée, repli EN), bouton clair/sombre, badge « Offert par [nom du spot] · valable N jours ».
6. **Hero** selon l'heure (Matin 6–12, Journée 12–17, Soir 17–22, Nuit 22–6) : audio mis en avant pour le créneau, sinon audio « mis en avant » ; titre traduit, durée, choix voix F/M mémorisé, image.
7. **Filtres** en pilules : Type, Moment, Voix (Voix masqué si Musique).
8. **Catalogue audios guidés** puis **Musiques** (« Avec fréquences binaurales – sans voix. »), cartes image + dégradé + ▶ ; message si vide.
9. **Lecteur** : lecture de l'URL Cloudinary de la voix choisie, enchaînement automatique sur la musique liée, contrôles écran verrouillé.
10. **Bloc « Retrouvez ces audios chez vous »** (fond clair fixe même en sombre) → `/offres?spot_origine_id=…`.

Design repris des maquettes Stitch (clair + sombre) et du design system B2C : Playfair Display + Plus Jakarta Sans, palette sable/vert/nuit, zones tactiles 44px, marges de sécurité iPhone.

## Points de sécurité à corriger (important)
- Aujourd'hui, la lecture publique des spots expose **le code PIN à tout le monde** : n'importe qui peut le lire. Je propose que la vérification du PIN se fasse côté serveur et que le code ne soit jamais envoyé au téléphone.
- Les visiteurs anonymes ne peuvent pas lire la table clients (normal, elle contient montants et notes). Les seules infos nécessaires (durée d'accès, mode d'accès, nom) seront fournies par une fonction serveur qui ne renvoie que ces champs.
- La lecture publique de `acces_spots` (tous les visiteurs) est trop large : je la remplace par l'enregistrement via le serveur uniquement.

## Hors périmètre de cette étape (à faire ensuite, séparément)
- Service Worker / mode hors-ligne et manifeste d'installation PWA (touche la racine du site).
- Page `/offres` et l'écran d'accès email.

## Détails techniques
- Fichiers : `src/routes/spots.$id.tsx`, `src/routes/spots.$id.acces.tsx` (placeholder), `src/components/pwa/*`, `src/lib/spot-public.functions.ts`, `src/locales/{fr,en,de,nl,es}.json`, styles PWA ajoutés sous un scope `.pwa` dans `styles.css` (ne change pas l'admin). Fonts ajoutées dans `__root` head (seule modification hors route, ajout de lien).
- Server fns publiques (client publishable, anon) : `getPublicSpot(id)` → spot sans pin_code + `{nom client, duree_acces_jours, mode_acces}` via fonction SQL SECURITY DEFINER `get_spot_public(uuid)` ; `verifySpotPin(id, pin)` → booléen via `verify_spot_pin(uuid,text)` ; `registerVisit(spotId, uuid)` → insert acces_spots si pas d'accès valide.
- Migration : fonctions ci-dessus ; colonne-grant pour retirer `pin_code` de la lecture anon sur spots (REVOKE SELECT + GRANT colonnes) ; suppression de `anon_read_acces_spots`.
- Catalogue : spot_audios(actif) → audios(publié) + audios_traductions(langue active, repli fr) en excluant les audios masqués via client_audios.visible=false. Type/Moment depuis `audios.type/moment` (table filtres vide).
- i18n : `react-i18next` n'est pas installé et le brief interdit d'ajouter une librairie sans accord → **je propose de l'installer (react-i18next + i18next)** ; sinon petit dictionnaire maison sans dépendance.
- UUID visiteur : cookie 365 j, repli localStorage. Media Session API native.
- head() : titre/description dynamiques du spot.
