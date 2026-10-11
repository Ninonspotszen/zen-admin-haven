# Zen Admin Haven

Je construis le back-office admin de Spots Zen, une plateforme audio bien-être B2B/B2C.

Stack imposée : React + Vite + Supabase + déploiement Vercel. N'utilise aucune autre stack.

Commence par mettre en place :
1. La connexion Supabase (je vais te donner les clés après)
2. La page de connexion avec Supabase Auth (email/mot de passe)
3. La vérification du rôle admin : après connexion, lis profiles.role pour l'UUID connecté — si role = 'admin' → accès au back-office, sinon → page "Accès refusé"
4. La navigation horizontale avec 6 onglets : Dashboard (/admin) · Clients B2B (/admin/clients) · Audios (/admin/audios) · Abonnés (/admin/abonnes) · Spots (/admin/spots) · Avatar "Ninon Godin / Admin / bonjour@spotszen.fr" en haut à droite

Ne construis aucun écran pour l'instant — juste l'auth et la nav vide.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zen-admin-haven.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/04ea7e1c-8a77-4661-bc3b-ae3b6b4aabc6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
