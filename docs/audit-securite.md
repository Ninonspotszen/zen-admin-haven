# Audit de sécurité — Spots Zen

*Réalisé du 16 au 19/10/2026 avec Claude Code, directement dans ce dépôt, avec Ninon Godin pour les vérifications dans les consoles (Supabase, Stripe, Vercel, Google Cloud, OVH).*
*Périmètre : le site www.spotszen.fr (Vercel), la base Supabase, les paiements Stripe, les emails Brevo, la connexion Google, le domaine.*

## 1. Résumé

| | Constat | Gravité | État |
|---|---|---|---|
| 1 | Un utilisateur connecté pouvait **modifier sa propre ligne d'abonné** et se donner le statut « actif » : accès gratuit à toute la bibliothèque | **Critique** | ✅ Corrigé le 16/10 |
| 2 | Le formulaire Professionnels pouvait être contourné par une **insertion directe** dans la base, sans la limite anti-spam | Moyenne | ✅ Corrigé le 16/10 |
| 3 | Code PIN et formulaires publics **sans limite de tentatives** | Moyenne | ✅ Corrigé le 16/10 |
| 4 | Une **copie Lovable** en ligne, avec un ancien code, branchée sur la même base | Moyenne | ✅ Dépubliée le 18/10 |
| 5 | Chaque événement Stripe était envoyé **en double** (copie Lovable + site) | Faible | ✅ Corrigé le 16/10 |
| 6 | Deux clés Stripe limitées inutiles encore actives | Faible | ✅ Révoquées le 18/10 |
| 7 | Connexion Google en mode « Test » et écran affichant `…supabase.co` (risque d'hameçonnage perçu) | Faible | ✅ Publiée et marque validée par Google le 16/10 |
| 8 | 14 fonctions `SECURITY DEFINER` signalées par le Security Advisor | Information | ✅ Revues : toutes voulues (§ 4) |
| 9 | Protection contre les mots de passe divulgués désactivée | Information | Accepté : le site n'utilise pas de mot de passe (§ 5) |

**Aucune vulnérabilité connue dans les dépendances** (`npm audit`, 19/10 : 0 critique, 0 haute, 0 moyenne, 0 faible).

## 2. Méthode

1. Lecture du code : fonctions serveur (`src/lib/*.functions.ts`), routes publiques (`src/routes/api/public/`), migrations SQL (`supabase/migrations/`).
2. Contrôle de la base **en production** par requêtes SQL exécutées par Ninon : état de la RLS sur chaque table (`pg_class.relrowsecurity`) et texte de chaque règle (`pg_policies`).
3. **Security Advisor** de Supabase (19/10) : 0 erreur, 15 avertissements, 1 suggestion.
4. Historique Git complet scanné à la recherche de secrets (motifs `sk_live_`, `rk_live_`, `whsec_`, `xkeysib-`, `sk-ant-`, jetons JWT `service_role`).
5. Journaux Stripe (Workbench → Logs) pour vérifier quelle clé fait réellement les appels.
6. Tests de bout en bout après chaque correction (bibliothèque, formulaire, paiement, webhook).

## 3. Détail des constats corrigés

### 3.1 Abonné pouvant se donner un accès payant (critique)
- **Cause** : la règle RLS `abonne_own_account` sur `abonnes_b2c` était `FOR ALL` (lecture **et** écriture de sa propre ligne). La bibliothèque vérifie le champ `statut` : il suffisait d'un compte gratuit (Google) et de deux lignes de code dans la console du navigateur pour passer `statut = 'actif'`.
- **Correction** : remplacée par `abonne_read_own_account` (`FOR SELECT` uniquement). Les écritures légitimes passent ailleurs : webhook Stripe et accès offerts (serveur, clé service), fiche abonné (règle admin), visite/langue/newsletter (fonctions dédiées limitées à ces colonnes).
- **Preuve** : migration `supabase/migrations/20261016130000_securite_rls_abonnes.sql`, commit `M6 - Audit sécurité : abonnés en lecture seule…` ; requête de contrôle exécutée en production ; bibliothèque et formulaire retestés.

### 3.2 Formulaire Professionnels contournable
- **Cause** : la règle `Anyone can submit a contact request` permettait d'insérer directement dans `contact_requests` depuis le navigateur, en contournant la limite anti-spam du serveur.
- **Correction** : règle supprimée ; le formulaire passe uniquement par la fonction serveur, qui applique la limite. Effet vérifié : une ancienne version du site (adresse de déploiement figée) recevait bien « Une erreur est survenue ».

### 3.3 Limites anti-abus
- Code PIN : blocage 10 minutes après 20 codes faux sur un spot (`get_spot_catalog`, table `limites_tentatives`).
- Formulaires : 5 demandes/heure/connexion et 50/jour (Professionnels) ; 3/heure et 100/jour (lien « continuer chez soi »). Protège aussi le quota Brevo.
- L'adresse IP n'est jamais stockée en clair (empreinte SHA-256), table purgée après 2 jours.

### 3.4 Stripe
- Le site utilise une **clé limitée** « Spots Zen site www » : *Checkout Sessions* en écriture, *Prices* et *Subscriptions* en lecture, rien d'autre. Vérifié dans les journaux Stripe (requête du 18/10 faite avec `rk_live_…5T9z0T`).
- C'est **la seule clé secrète active** du compte (anciennes clés révoquées le 18/10).
- Webhook : une seule destination, `https://www.spotszen.fr/api/public/stripe-webhook` ; **signature vérifiée** (HMAC-SHA256, comparaison à temps constant, tolérance sur l'horodatage contre le rejeu) — `src/routes/api/public/stripe-webhook.ts`.

### 3.5 Copie Lovable
`zen-admin-haven.lovable.app` exécutait un ancien code (sans les protections ci-dessus) sur la même base. Dépubliée le 18/10 ; Lovable reste l'éditeur (synchronisation GitHub → Vercel).

## 4. Fonctions `SECURITY DEFINER` (Security Advisor, 14 avertissements)

Ces fonctions s'exécutent avec des droits élevés : c'est voulu, chacune ne renvoie que le strict nécessaire et vérifie ses propres conditions.

| Fonction | Appelable par | Ce qu'elle protège |
|---|---|---|
| `get_spot_public` | visiteurs | infos publiques d'un spot **actif** uniquement |
| `get_spot_catalog` | visiteurs | catalogue du spot, **code PIN vérifié**, limite de tentatives |
| `register_spot_visit` | visiteurs | compteur d'accès (7 jours) par téléphone et par spot |
| `check_spot_email_domain` | visiteurs | renvoie seulement vrai/faux : l'email appartient-il au domaine du client |
| `get_public_titles` | visiteurs | titres des audios **publiés** |
| `get_library_catalog` | connectés | catalogue complet **seulement si statut actif, offert, ambassadeur ou paiement en cours** |
| `enregistrer_visite`, `changer_newsletter` | connectés | modifient **uniquement sa propre ligne**, uniquement ces colonnes |
| `is_admin` | connectés | renvoie vrai/faux pour soi-même |

La fonction interne `get_spot_catalog_interne` (sans limite de tentatives) **n'est pas** appelable depuis le navigateur.

## 5. Risques acceptés (et pourquoi)

| Risque | Pourquoi on l'accepte |
|---|---|
| N'importe qui peut ajouter une « écoute » sur un audio publié | Nécessaire pour compter les écoutes anonymes ; le seul effet possible est de fausser un peu les statistiques |
| La limite de 7 jours par téléphone se contourne en vidant les données du navigateur | L'accès libre est voulu pour les spots ouverts au public ; les spots privés ont le code PIN ou l'email professionnel |
| `get_spot_public` révèle le domaine email attendu pour un spot « email professionnel » | Il sert à guider le visiteur ; ce n'est pas une donnée secrète |
| Protection « mots de passe divulgués » désactivée | Aucun mot de passe dans l'interface (lien magique, code ou Google) ; un compte créé sans abonnement n'a accès à rien |
| Clé publique Supabase (`anon`) présente dans le dépôt (`.env` géré par Lovable) | Elle est publique par conception ; l'accès aux données est protégé par la RLS, active sur les 17 tables |

## 6. Contrôles sans anomalie

- **RLS active sur les 17 tables** du schéma public (`limites_tentatives` : 0 règle, donc inaccessible depuis le navigateur — voulu).
- Aucun **secret** dans l'historique Git ; secrets uniquement dans Vercel (variables marquées sensibles).
- Rôle admin vérifié côté serveur par `is_admin()` (`profiles.role`), jamais depuis le jeton.
- Fonctions serveur réservées à l'admin (accès offert, robot en simulation, traduction IA) : contrôle `is_admin` avant toute action.
- Robot quotidien protégé par `CRON_SECRET` ; un même email ne part jamais deux fois (clé unique).
- **HTTPS** sur www.spotszen.fr (certificat Vercel) ; domaine apex redirigé en 308.
- **Connexion Google** : application publiée, marque « Spots Zen » validée par Google, domaine validé dans Search Console.
- **Agent IA (traduction)** : réservé à l'admin, texte traité comme une donnée (test d'injection réussi le 15/10), bouton off `TRADUCTION_IA_ACTIVE`, journal `agent_logs`.

## 7. Reste à faire

- Passer à **Supabase Pro** (sauvegardes automatiques) et **Vercel Pro** avant d'en parler publiquement.
- Envisager un domaine de connexion `auth.spotszen.fr` (option payante de Supabase).
- Ajouter une surveillance des erreurs (Sentry ou équivalent).
- Agent boîte mail : tests « bouton off » et « injection », connecteurs limités à Gmail + Notion.
- Refaire cet audit après chaque grosse évolution (nouvelle table = nouvelle RLS à vérifier).
