# MEMORY — Sécurité base de données

## Spots et clients : lecture réservée à l'admin (13/10/2026)
- Supprimé : policy `anon_read_spots` (exposait `pin_code` aux visiteurs).
- `public.spots` : `admin_all_spots` (ALL) + `admin_read_spots` (SELECT, authenticated, `is_admin()`).
- `public.clients` : `admin_all_clients` (ALL) + `admin_read_clients` (SELECT, authenticated, `is_admin()`).
- RLS activée sur les deux tables ; `REVOKE SELECT ... FROM anon`.
- La PWA passe uniquement par les fonctions SECURITY DEFINER `get_spot_public`, `verify_spot_pin`, `get_spot_catalog`, `register_spot_visit` (non modifiées).
