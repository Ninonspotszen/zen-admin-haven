# Spots Zen

Spots Zen propose des **immersions audio bien-être** (méditations guidées, respirations, visualisations, musiques composées sur mesure) accessibles **sans application** : en scannant un QR code dans un lieu partenaire (hébergement, entreprise, campus), ou chez soi avec un abonnement.

Application web progressive (PWA) avec trois espaces : la page d'un spot pour les visiteurs, la bibliothèque des abonnés, et le back-office d'administration.

## 🔗 Accès

- **App en ligne :** https://www.spotszen.fr (production, hébergée sur Vercel ; `spotszen.fr` redirige vers `www`)
- **Comptes de test :** fournis séparément au jury (un compte abonné, un compte admin)

## 🛠️ Stack

| Rôle | Outil |
|---|---|
| Génération et front | Lovable · React 19 · TypeScript · TanStack Start · Tailwind CSS 4 · Vite |
| Base de données, Auth, sécurité | Supabase (PostgreSQL, Auth par lien magique, code ou Google, RLS) |
| Déploiement | Vercel, branché sur ce repo GitHub |
| Paiement | Stripe (abonnements, portail client, webhook signé) |
| Emails et CRM | Brevo (emails de connexion via SMTP, 10 emails transactionnels × 5 langues, listes de contacts) |
| Automatisations | Vercel Cron (robot quotidien des emails) · agent boîte mail (tâche planifiée Claude : tri, brouillons, brief Notion) |
| Surveillance | UptimeRobot (www.spotszen.fr, toutes les 5 minutes) |
| Tests | Vitest (tests unitaires) · Playwright (22 parcours × ordinateur + téléphone) |
| Audio | Cloudinary (hébergement des fichiers) · ElevenLabs (production des voix traduites) |
| QR codes | Lien direct `www.spotszen.fr/spots/{id}`, généré dans l'admin (PNG + SVG) |
| Traductions de l'interface | i18next (FR, EN, DE, NL, ES) |
| IA | API Claude d'Anthropic (modèle Haiku 5.5) : traduction assistée du catalogue |

## ✨ Fonctionnalités principales

- **Page spot** (`/spots/:id`) : accès immédiat depuis un QR code, sans compte. Accès libre, par email professionnel ou par code PIN selon le lieu. L'immersion mise en avant change selon l'heure (matin, journée, soir, nuit).
- **Lecteur audio** : choix de la voix (féminine ou masculine), écoute écran verrouillé, messages clairs en cas de réseau faible ou coupé, reprise automatique au retour du réseau.
- **Abonnement** (`/offres`) : 5 €/mois ou 49 €/an, premier mois offert à la première souscription, paiement et résiliation via Stripe.
- **Bibliothèque abonné** (`/bibliotheque`) : catalogue filtrable, gestion de l'abonnement.
- **Emails automatiques en 5 langues** (Brevo) : bienvenue, confirmation de résiliation, accès offert, accusé de réception B2B, lien « continuer chez soi » pour les visiteurs d'un spot ; et, envoyés chaque matin par le **robot quotidien** (Vercel Cron) : accueil J+3, relance après 14 jours sans visite, fin d'accès offert (J-7 et lendemain), rappel annuel de reconduction (art. L.215-1 du Code de la consommation). Un même email ne part jamais deux fois ; journal et simulation dans l'admin (onglet Emails). Détail : [`docs/tunnel-emails.md`](docs/tunnel-emails.md).
- **Suivi commercial B2B** (`/admin/demandes`) : formulaire `/professionnels` → alerte email + demande dans l'admin, étapes (contactée, démo, devis, pilote, client, perdue), note et date de prochaine action, résumé du matin.
- **Feature IA, traduction assistée** : dans la fiche d'un audio, Claude (Haiku 5.5) propose le titre et la description en EN, DE, NL, ES ; l'admin relit et enregistre. Chaque passage est journalisé (`agent_logs`). Détail : [`docs/fiche-6-briques-traduction-ia.md`](docs/fiche-6-briques-traduction-ia.md).
- **Back-office** (`/admin`) : clients B2B, spots et QR codes, bibliothèque audio, abonnés, accès offerts.
- **Dashboard admin en temps réel** (`/admin`, réservé au rôle admin) : pilotage, écoutes (par jour, top audios, moment de la journée, langue, voix, dernières écoutes), clients B2C (accès, revenu mensuel estimé, inscriptions, résiliations, conversion depuis un spot) et activité par spot. Mise à jour automatique via Supabase Realtime.
- **PWA installable** : épinglable sur l'écran d'accueil comme une application.

## 🚀 Installation en local

Le projet utilise [Bun](https://bun.sh) (le fichier `bun.lock` fait foi).

```bash
git clone https://github.com/Ninonspotszen/zen-admin-haven.git
cd zen-admin-haven
bun install
bun run dev
```

Autres commandes : `bun run build` (build de production), `bun run lint`, `bun run test` (tests unitaires), `bun run test:e2e` (parcours Playwright ; voir [`docs/qa-tests.md`](docs/qa-tests.md)).

## 🔑 Variables d'environnement

| Variable | Rôle | Où |
|---|---|---|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Connexion Supabase côté navigateur (clé **publique**, protégée par les RLS) | `.env` + Vercel |
| `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` | Les mêmes valeurs, lues par le serveur | `.env` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Actions admin côté serveur uniquement | Vercel, **secret** |
| `STRIPE_SECRET_KEY` | Clé Stripe **restreinte** : Checkout Sessions (écriture), Prices et Subscriptions (lecture) | Vercel, **secret** |
| `STRIPE_WEBHOOK_SECRET` | Vérification de la signature des webhooks Stripe | Vercel, **secret** |
| `BREVO_API_KEY` | Envoi des emails transactionnels (clé restreinte) | Vercel, **secret** |
| `EMAILS_ACTIFS` | Interrupteur des emails clients : seuls les envois avec la valeur `true` partent | Vercel |
| `NOTIF_CONTACT_ACTIVE` · `NOTIF_ABONNES_ACTIVE` · `NOTIF_RESUME_ACTIVE` | Alertes internes : nouvelle demande B2B, abonnés (nouvel abonné, paiement en échec, résiliation), résumé du matin | Vercel |
| `BREVO_SYNC_ACTIF` · `BREVO_ATTRIBUT_LANGUE` · `BREVO_LISTE_*` | Synchronisation des contacts vers les listes Brevo (abonnés, accès offerts, prospects B2B, visiteurs, newsletter, actualités pro) | Vercel |
| `CRON_SECRET` | Protège la route du robot quotidien (`/api/public/cron/quotidien`) | Vercel, **secret** |
| `ANTHROPIC_API_KEY` | Feature IA : traduction assistée du catalogue (API Claude) | Vercel, **secret** |
| `TRADUCTION_IA_ACTIVE` | Bouton off de la feature IA : seule la valeur `true` autorise l'appel à Claude | Vercel |

🔒 Aucune clé secrète n'est versionnée. Le fichier `.env` présent dans le repo est géré par Lovable et ne contient que l'URL Supabase et la **clé publique** (rôle `anon`), conçue pour être visible dans le navigateur : l'accès aux données est protégé par les règles RLS de Supabase.

## ☁️ Déploiement

Hébergement sur **Vercel**, connecté à ce repo : chaque push sur `main` déclenche un déploiement de production automatique. Les modifications faites dans Lovable arrivent sur `main` et se déploient de la même façon (Lovable ne sert pas d'hébergement).

## 🗂️ Documentation

- Schéma de la base de données : [`docs/schema-era.md`](docs/schema-era.md)
- Audit de sécurité : [`docs/audit-securite.md`](docs/audit-securite.md)
- Tunnel emails et CRM : [`docs/tunnel-emails.md`](docs/tunnel-emails.md)
- Tests et qualité : [`docs/qa-tests.md`](docs/qa-tests.md)
- Feature IA (fiche 6 briques) : [`docs/fiche-6-briques-traduction-ia.md`](docs/fiche-6-briques-traduction-ia.md)
- Migrations SQL : [`supabase/migrations/`](supabase/migrations/)
- Pages légales (CGV, CGU, confidentialité) : [`docs/legal/`](docs/legal/)

## 📜 Historique des commits

Lovable crée automatiquement un commit à chaque modification (messages courts générés par l'outil). Les étapes importantes sont nommées selon la convention de la formation, `M[n] - Description` (par exemple `M0 - Setup initial`, `M5 - Email de bienvenue abonné`).

## 👤 Auteur

Ninon Godin, fondatrice de Spots Zen · Projet fil rouge du Bootcamp Vibe Coding, Lion.
