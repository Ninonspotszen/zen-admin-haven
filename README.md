# Spots Zen

Spots Zen propose des **immersions audio bien-être** (méditations guidées, respirations, visualisations, musiques composées sur mesure) accessibles **sans application** : en scannant un QR code dans un lieu partenaire (hébergement, entreprise, campus), ou chez soi avec un abonnement.

Application web progressive (PWA) avec trois espaces : la page d'un spot pour les visiteurs, la bibliothèque des abonnés, et le back-office d'administration.

## 🔗 Accès

- **App en ligne :** https://spotszen.fr (production, hébergée sur Vercel)
- **Comptes de test :** fournis séparément au jury (un compte abonné, un compte admin)

## 🛠️ Stack

| Rôle | Outil |
|---|---|
| Génération et front | Lovable · React 19 · TypeScript · TanStack Start · Tailwind CSS 4 · Vite |
| Base de données, Auth, sécurité | Supabase (PostgreSQL, Auth par lien magique, code ou Google, RLS) |
| Déploiement | Vercel, branché sur ce repo GitHub |
| Paiement | Stripe (abonnements, portail client, webhook) |
| Emails | Brevo (emails de connexion via SMTP, emails transactionnels) |
| Audio | Cloudinary (hébergement des fichiers) · ElevenLabs (production des voix traduites) |
| QR codes | Short.io (liens permanents imprimés) |
| Traductions de l'interface | i18next (FR, EN, DE, NL, ES) |

## ✨ Fonctionnalités principales

- **Page spot** (`/spots/:id`) : accès immédiat depuis un QR code, sans compte. Accès libre, par email professionnel ou par code PIN selon le lieu. L'immersion mise en avant change selon l'heure (matin, journée, soir, nuit).
- **Lecteur audio** : choix de la voix (féminine ou masculine), écoute écran verrouillé, messages clairs en cas de réseau faible ou coupé, reprise automatique au retour du réseau.
- **Abonnement** (`/offres`) : 5 €/mois ou 49 €/an, premier mois offert à la première souscription, paiement et résiliation via Stripe.
- **Bibliothèque abonné** (`/bibliotheque`) : catalogue filtrable, gestion de l'abonnement.
- **Emails automatiques** : bienvenue à l'abonnement, confirmation de résiliation, accès offert.
- **Back-office** (`/admin`) : clients B2B, spots et QR codes, bibliothèque audio, abonnés, accès offerts, statistiques d'écoute.
- **PWA installable** : épinglable sur l'écran d'accueil comme une application.

## 🚀 Installation en local

Le projet utilise [Bun](https://bun.sh) (le fichier `bun.lock` fait foi).

```bash
git clone https://github.com/Ninonspotszen/zen-admin-haven.git
cd zen-admin-haven
bun install
bun run dev
```

Autres commandes : `bun run build` (build de production), `bun run lint`, `bun run test`.

## 🔑 Variables d'environnement

| Variable | Rôle | Où |
|---|---|---|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY` | Connexion Supabase côté navigateur (clé **publique**, protégée par les RLS) | `.env` + Vercel |
| `SUPABASE_URL` · `SUPABASE_PUBLISHABLE_KEY` | Les mêmes valeurs, lues par le serveur | `.env` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Actions admin côté serveur uniquement | Vercel, **secret** |
| `STRIPE_SECRET_KEY` | Clé Stripe **restreinte** (création des sessions de paiement) | Vercel, **secret** |
| `STRIPE_WEBHOOK_SECRET` | Vérification de la signature des webhooks Stripe | Vercel, **secret** |
| `BREVO_API_KEY` | Envoi des emails transactionnels (clé restreinte) | Vercel, **secret** |
| `EMAILS_ACTIFS` | Interrupteur des emails : seuls les envois avec la valeur `true` partent | Vercel |

🔒 Aucune clé secrète n'est versionnée. Le fichier `.env` présent dans le repo est géré par Lovable et ne contient que l'URL Supabase et la **clé publique** (rôle `anon`), conçue pour être visible dans le navigateur : l'accès aux données est protégé par les règles RLS de Supabase.

## ☁️ Déploiement

Hébergement sur **Vercel**, connecté à ce repo : chaque push sur `main` déclenche un déploiement de production automatique. Les modifications faites dans Lovable arrivent sur `main` et se déploient de la même façon (Lovable ne sert pas d'hébergement).

## 🗂️ Documentation

- Schéma de la base de données : [`docs/schema-era.md`](docs/schema-era.md)
- Migrations SQL : [`supabase/migrations/`](supabase/migrations/)
- Pages légales (CGV, CGU, confidentialité) : [`docs/legal/`](docs/legal/)

## 📜 Historique des commits

Lovable crée automatiquement un commit à chaque modification (messages courts générés par l'outil). Les étapes importantes sont nommées selon la convention de la formation, `M[n] - Description` (par exemple `M0 - Setup initial`, `M5 - Email de bienvenue abonné`).

## 👤 Auteur

Ninon Godin, fondatrice de Spots Zen · Projet fil rouge du Bootcamp Vibe Coding, Lion.
