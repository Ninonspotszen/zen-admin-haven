# MEMORY — Sécurité base de données

## Spots et clients : lecture réservée à l'admin (13/10/2026)
- Supprimé : policy `anon_read_spots` (exposait `pin_code` aux visiteurs).
- `public.spots` : `admin_all_spots` (ALL) + `admin_read_spots` (SELECT, authenticated, `is_admin()`).
- `public.clients` : `admin_all_clients` (ALL) + `admin_read_clients` (SELECT, authenticated, `is_admin()`).
- RLS activée sur les deux tables ; `REVOKE SELECT ... FROM anon`.
- La PWA passe uniquement par les fonctions SECURITY DEFINER `get_spot_public`, `verify_spot_pin`, `get_spot_catalog`, `register_spot_visit` (non modifiées).

## URL audio protégées (13/10/2026)
- `audios_traductions` : policy `read_traductions_published` supprimée → `admin_read_traductions` (SELECT, authenticated, `is_admin()`).
- `get_audio_public` et `link_abonne_on_signup` : EXECUTE retiré à PUBLIC/anon/authenticated (trigger inchangé).
- Table `kv_store_b6181f40` supprimée (vide, inutilisée).
- Nouvelle `get_library_catalog()` (SECURITY DEFINER, authenticated uniquement) : NULL si pas d'abonné `actif/offert/ambassadeur` (abonnes_b2c.id = auth.uid()), sinon catalogue publié avec traductions. Utilisée par `/bibliotheque`.
- Nouvelle `get_public_titles(uuid[])` (anon + authenticated) : titres seulement des audios publiés, jamais cloudinary_url. Utilisée par `/offres`.
- Alertes linter attendues sur ces deux fonctions : accès volontaire.

## Fiche audio admin — traductions multilingues (13/10/2026)
- `/admin/audios/$id` : onglets FR/EN/DE/NL/ES avec pastille de progression (voix avec URL).
- Voix stockées en `feminine` / `masculine` / `aucune` ; update si ligne existante, insert si un champ rempli, jamais de suppression.
- Musiques (ligne `aucune` ou type Musique) : seulement un titre traduit hors FR, même fichier pour toutes les langues.
- Validation zod : URL renseignée ⇒ titre obligatoire et URL en https://. Bandeau orange si une langue n'a qu'une voix sur deux.

## Accès spot par domaine email (13/10/2026)
- `clients.mode_acces` : NOT NULL, défaut `qr_libre`, valeurs `qr_libre` | `email_domaine`. Domaine email en minuscules sans @, correspondance exacte, obligatoire en mode email.
- `spot_email_ok(p_id)` (authenticated) et `check_spot_email_domain(p_id, p_email)` (anon+authenticated) ; client en statut `Pilote` ou `Actif annuel` requis.
- `get_spot_public` renvoie aussi `domaine_email` (mode email seulement) et `pin_requis`.
- `get_spot_catalog` : mode `email_domaine` → `spot_email_ok` (PIN ignoré) ; sinon (y compris sans client) accès si pas de PIN ou PIN correct ; renvoie `[]` si vide.
- `register_spot_visit` : pas d'expiration en mode `email_domaine` ; `qr_libre` inchangé. `verify_spot_pin` non modifiée.
- La page /spots/$id n'est pas encore adaptée.

## Statut client : contrainte corrigée (13/10/2026)
- `clients_statut_check` accepte désormais `En attente de paiement` (valeur envoyée par le back-office), `Pilote`, `Actif annuel`, `Suspendu`. L'ancienne valeur `En attente` n'existait sur aucune ligne.
- `clients_statut_paiement_check` non modifiée : son `En attente` concerne la colonne `statut_paiement`, c'est correct.

## Statuts clients alignés (2026-10-13)
- clients.statut : 'En attente de paiement' | 'Pilote' | 'Actif' | 'Suspendu' ("Actif annuel" renommé "Actif" ; la fréquence est un champ séparé).
- clients.statut_paiement : 'En attente' | 'Virement reçu' | 'En retard'.
- spot_email_ok / check_spot_email_domain acceptent les clients 'Pilote' et 'Actif' (droits inchangés).
- computeRenewal : début + mois offerts + (1 si Mensuel, 12 si Annuel), formatée en date locale (pas de toISOString).

## Filtre Enfant, durées et aperçu /offres (13/10/2026)
- `get_spot_catalog` et `get_library_catalog` renvoient aussi `a.public_cible` (rien d'autre changé, droits conservés).
- Filtre « Enfant » (spot + bibliothèque) : `a.public_cible === "enfant"` (et non plus `moment`).
- Durées en dur alignées sur les durées validées dans particuliers-page.tsx et home-page.tsx.
- /offres : aperçu en grille 2×2 au format des immersions de la page spot, cadenas 44 px en bas à droite, cartes non interactives.


## Corrections Clients B2B (14/10/2026)
- Montant = échéance mensuelle ou annuelle ; synthèses annualisées (mensuel × 12), CSV avec fréquence.
- Tableau défilant horizontalement, bouton Facture supprimé (facturation externe), compteurs par statut.
- Fin du pilote modifiable à la création (J+28 en date locale) et sur la fiche ; sauvegardée uniquement en statut Pilote.
- Alerte orange J-0 à J-7 ; pilote terminé en rouge ; renouvellement inchangé.
- Envoi d’email d’accès renommé avec confirmation, action existante conservée.


## Filtres et moments audio (14/10/2026)
- Spot : public_cible conservé lors de la construction du catalogue pour le filtre Enfant.
- Spot et bibliothèque : les six filtres se répartissent sur plusieurs lignes ; les cartes guidées affichent audios.moment traduit si connu, sans changer la grande carte ni sa sélection.
- Valeurs Moment : Matin, Journée, Soir, Nuit, Tous moments ; liste fermée sur la fiche audio, clé common.moment.anytime dans les cinq langues.
- Offres : mêmes badges traduits, y compris Tous moments. Vitrines : lac Matin, étoiles Soir · Enfants, ballon Tous moments · Enfants, orage Soir.

## Salutation bibliothèque (14/10/2026)
- Prénom : abonnes_b2c.prenom (1er mot), sinon 1er mot du nom Google, sinon vide → `lib.greetingNoName` (« Bonjour ♡ »). Jamais l'email.

## Dashboard admin (14/10/2026)
- Renouvellements 30 j : clients `Actif` uniquement ; dates passées en rouge « en retard ».
- Abonnés expirant sous 7 j : statuts `offert`/`ambassadeur`, date entre aujourd'hui et J+7.
- Dates de référence calculées en date locale (pas de toISOString).

## Mode d'accès Email professionnel — back-office (14/10/2026)
- Création et fiche client : choix « Accès libre » (`qr_libre`) / « Email professionnel » (`email_domaine`) + domaine normalisé (trim, minuscules, sans @), validé par zod (regex de la contrainte) et refus des messageries grand public.
- `domaine_email` = null en accès libre. Confirmation si le mode change et que le client a des spots.
- Liste : pastille `@domaine` sous le nom. Fiche client : PIN barré « Ignoré : accès par email professionnel ». Fiche spot : ligne « Accès : … » en lecture seule.

## Pré-remplissage des audios à la création d'un spot (14/10/2026)
- Trigger `spots_assign_default_audios` (AFTER INSERT sur `spots`) → `spot_assign_default_audios()` (SECURITY DEFINER, EXECUTE retiré à PUBLIC/anon/authenticated).
- Ajoute tous les audios publiés non masqués pour le client (`client_audios.visible=false` exclus), actifs, ordre selon `audios.ordre` puis `titre_fr`.
- Recommandations : reveil-du-corps-f Matin, sieste-reparatrice-f Journée, songe-du-soir-orage-f Soir, glisser-vers-le-sommeil-f Nuit (rien si l'audio n'est pas assigné).
- Spots existants non modifiés.

## F1 — Accès visiteur par email professionnel + PIN facultatif (14/10/2026)
- /spots/$id : `get_spot_catalog` appelé directement (plus de `verify_spot_pin`) ; NULL = refusé, [] = catalogue vide. PIN mémorisé seulement s'il existe.
- Mode `email_domaine` : session → catalogue ou « mauvais compte » ; sinon email (zod + domaine + `check_spot_email_domain`) → code OTP 8 chiffres (`verifyOtp`), renvoi après 60 s. Email en state React uniquement.
- `pin_requis = false` → catalogue direct. Écoutes toujours anonymes.
- Admin : PIN facultatif (vide → null, sinon 4 chiffres) à la création et sur la fiche spot.
- Clés `spot.email.*` dans les 5 langues.

## Bandeau « Offert par » de la fiche spot (14/10/2026)
- Étoiles retirées des 5 langues : `spot.sponsor.badge` et `player.sponsor` = « Offert par {nom} » (plus de `★★★★`).
- Nouvelle clé `spot.sponsor.unlimited` dans les 5 langues.
- `spots.$id.tsx` : `spot.mode_acces === "email_domaine"` → badge + `spot.sponsor.unlimited` ; sinon badge + `spot.sponsor.days` si la durée est connue.
- Vérifié en navigateur : spot démo « Offert par Camping le Tedey · Votre accès bien-être valable 7 jours… » et spot email « Offert par Test Email Pro · Votre accès bien-être, où que vous soyez », sans étoiles ; lecteur plein écran sans étoiles.

## Expiration douce (14/10/2026)
- register_spot_visit lit le dernier accès (ORDER BY premiere_visite DESC). qr_libre : accès pendant duree_acces_jours figés, puis `acces_expire` 30 jours, puis nouvel accès (nouvelle ligne, durée actuelle du client). email_domaine : jamais d'expiration. Pas de contrainte UNIQUE sur acces_spots.
- Page spot état expired : carte douce (spot.expired.title/text/cta) → /offres, sans bandeau sponsor.
- Fiche client : champ « Durée d'accès offerte (jours) » 1–365 visible seulement en Accès libre.

## F9 — Tunnel B2B → B2C (14/10/2026)
- /offres?spot_origine_id=<uuid> mémorise `sz_spot_origine` ({id,date}) en localStorage, 30 jours max.
- Checkout transmet spotOrigineId → metadata Stripe (session + abonnement) ; le webhook remplit abonnes_b2c.spot_origine_id si spot existant, sans jamais écraser une valeur.
- Bibliothèque : date = date_renouvellement si actif, sinon date_fin_acces ; purge `sz_spot_origine` pour actif/offert/ambassadeur.
- Admin : colonne « Spot d'origine » (abonnés), « Abonnés convertis » (fiche client, statut actif).
- /particuliers : tous les boutons d'abonnement vont vers /offres (liens Stripe directs supprimés).

## Écoutes anonymes et expiration des accès offerts (15/10/2026)
- Migration `20261015120000_ecoutes_anonymes_expiration_acces_offerts.sql` (à exécuter dans le SQL Editor).
- `ecoutes` : policies `ecoutes_insert_own` et `ecoutes_select_own` supprimées (créées hors repo, inutilisées ; la première ne vérifiait pas que l'audio était publié), `anon_insert_ecoutes` réécrite sans `user_id`, puis colonne `user_id` supprimée (sans CASCADE). Écoutes anonymes, conformément à la décision RGPD du 18/09/2026.
- `ecoutes` : toujours en ajout seul pour les visiteurs (aucun UPDATE) ; une ligne par écoute, envoyée à la fin avec la durée réellement écoutée.
- `get_library_catalog()` : `offert` et `ambassadeur` n'ouvrent la bibliothèque que jusqu'à `date_fin_acces` (incluse) ; `actif` et `paiement_echoue` inchangés.
- Make retiré : plus aucun webhook Make dans le code ; l'email « Accès offert » passe par Brevo (modèle n°5), le bouton « Envoyer l'email d'accès » B2B est supprimé (pas d'email de contact dans `clients`).
