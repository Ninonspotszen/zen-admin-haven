# Schéma ERA — Base de données Spots Zen

> Régénéré le 15/10/2026 à partir de la base réelle (`src/integrations/supabase/types.ts`), après le nettoyage du 15/10 (écoutes anonymes : plus de colonne `user_id` dans `ecoutes`).
> 13 tables. L'état de la RLS table par table est vérifié dans le rapport d'audit sécurité.

## Diagramme de relations

```mermaid
erDiagram
    clients {
        string couleur_primaire
        string created_at
        string date_debut
        string date_debut_acces
        string date_pilote_fin
        string date_renouvellement
        string domaine_email
        int duree_acces_jours
        text_array emails_autorises
        string frequence_facturation
        string id PK
        string langue_preferee
        string logo_url
        string mode_acces
        int mois_offerts
        int montant
        string nom
        string note_interne
        string pack_souscrit
        string shortio_slug
        string statut
        string statut_paiement
        string type
    }
    spots {
        string adresse
        string client_id FK
        string created_at
        string description
        string id PK
        int latitude
        int longitude
        string nom
        string note_interne
        string photo_url
        string pin_code
        string shortio_url
        string slug
        string statut
    }
    spot_audios {
        bool actif
        string audio_id FK
        string client_id FK
        string id PK
        bool mis_en_avant
        string mis_en_avant_moment
        int ordre
        string spot_id FK
    }
    client_audios {
        string audio_id FK
        string client_id FK
        string id PK
        int priorite
        bool visible
    }
    acces_spots {
        int duree_acces_jours
        string id PK
        string premiere_visite
        string spot_id FK
        string uuid_visiteur
    }
    audios {
        string created_at
        int duree_secondes
        string groupe_slug
        string id PK
        string image_url
        string moment
        string musique_suite_id FK
        string note_production
        int ordre
        string public_cible
        string reference_interne
        string slug
        string statut
        string titre_fr
        string type
        string voix
    }
    audios_traductions {
        string audio_id FK
        string cloudinary_url
        string created_at
        string description
        string id PK
        string langue
        string titre
        string voix
    }
    filtres {
        string id PK
        string nom
        text_array valeurs_possibles
    }
    audio_filtres {
        string audio_id FK
        string filtre_id FK
        string id PK
        string valeur
    }
    abonnes_b2c {
        string code_parrainage
        string created_at
        string date_fin_acces
        string date_fin_prevue
        string date_renouvellement
        string email
        string formule
        string id PK
        string langue_preferee
        string note_interne
        string parrain_id FK
        string prenom
        string spot_origine_id FK
        string statut
        string stripe_customer_id
        string stripe_subscription_id
        string user_id
    }
    profiles {
        string created_at
        string email
        string id PK
        string role
    }
    ecoutes {
        string audio_id FK
        int duree_ecoute_sec
        string id PK
        string langue
        string spot_id FK
        string timestamp
        string voix
    }
    contact_requests {
        string created_at
        string email
        string etablissement
        string id PK
        string message
        string nom
        string secteur
        string taille
        string type_structure
    }

    clients ||--o{ spots : "possède"
    audios ||--o{ spot_audios : "audio du spot"
    clients ||--o{ spot_audios : "client du spot"
    spots ||--o{ spot_audios : "catalogue du spot"
    audios ||--o{ client_audios : "audio accordé"
    clients ||--o{ client_audios : "catalogue du client"
    spots ||--o{ acces_spots : "visites"
    audios ||--o{ audios : "musique associée"
    audios ||--o{ audios_traductions : "traduit en"
    audios ||--o{ audio_filtres : "catégorisé par"
    filtres ||--o{ audio_filtres : "filtre"
    abonnes_b2c ||--o{ abonnes_b2c : "parrain"
    spots ||--o{ abonnes_b2c : "spot d origine"
    audios ||--o{ ecoutes : "écouté"
    spots ||--o{ ecoutes : "écouté sur"
```

Liens vers les comptes : `profiles.id` et `abonnes_b2c.id` référencent `auth.users.id` (comptes Supabase Auth, non représentés ci-dessus).

## Description des tables

### Cœur B2B
| Table | Rôle |
|---|---|
| `clients` | Établissements partenaires : statut (En attente de paiement · Pilote · Actif · Suspendu), mode d'accès (`qr_libre` ou `email_domaine`), facturation |
| `spots` | Lieux physiques équipés d'un QR code (Short.io), PIN optionnel (`pin_code`, vide = accès libre) |
| `spot_audios` | Audios proposés sur un spot, ordre et mise en avant par moment |
| `client_audios` | Audios visibles ou masqués pour un client (catalogue personnalisé) |
| `acces_spots` | Visites d'un spot par visiteur anonyme (UUID stocké sur l'appareil) et durée d'accès |

### Cœur audio
| Table | Rôle |
|---|---|
| `audios` | Catalogue maître : type, moment, public, durée, statut (`publié` / `brouillon`), musique associée |
| `audios_traductions` | Titre, description, voix (`feminine` · `masculine` · `aucune`) et URL Cloudinary, par langue |
| `filtres` · `audio_filtres` | Filtres de la bibliothèque et leurs valeurs par audio |

### Cœur B2C et suivi
| Table | Rôle |
|---|---|
| `abonnes_b2c` | Abonnés particuliers : statut (`actif` · `paiement_echoue` · `offert` · `ambassadeur` · `inactif` · `resilie`), Stripe, spot d'origine, parrainage, dates de fin |
| `profiles` | Rôle de chaque compte (`admin` ou `user`), utilisé par `is_admin()` |
| `ecoutes` | Écoutes **anonymes** : audio, spot, langue, voix, durée réellement écoutée |
| `contact_requests` | Demandes envoyées depuis le formulaire `/professionnels` |

## Fonctions SECURITY DEFINER

| Fonction | Rôle |
|---|---|
| `is_admin()` | Vrai si `profiles.role = 'admin'` pour l'utilisateur connecté ; utilisée par toutes les règles RLS admin |
| `get_spot_public()` | Infos publiques d'un spot pour la page QR (sans exposer la table) |
| `get_spot_catalog()` | Catalogue d'un spot selon son mode d'accès |
| `get_library_catalog()` | Catalogue de la bibliothèque : abonnés `actif`/`paiement_echoue`, et `offert`/`ambassadeur` **jusqu'à `date_fin_acces`** |
| `get_audio_public()` · `get_public_titles()` | Métadonnées et titres publics des audios |
| `register_spot_visit()` | Enregistre une visite dans `acces_spots` |
| `check_spot_email_domain()` | Vérifie qu'une adresse appartient au domaine du client avant l'envoi du lien |
| `verify_spot_pin()` · `spot_email_ok()` | Anciennes fonctions, accès fermé le 14/10/2026 (toujours présentes dans la base) |

## Règle notable

- `ecoutes` n'accepte que des **ajouts** (aucune modification par les visiteurs), et seulement pour un audio publié : les statistiques ne peuvent pas être trafiquées.
