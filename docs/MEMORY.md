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
