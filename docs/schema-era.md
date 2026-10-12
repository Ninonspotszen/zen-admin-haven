# Schéma ERA — Base de données Spots Zen

> Généré le 12/10/2026 · Source : `src/integrations/supabase/types.ts`

## Diagramme de relations

```mermaid
erDiagram
    clients {
        uuid id PK
        string nom
        string type
        string statut
        string email
        string domaine_email
        string langue_preferee
        string statut_paiement
        date date_pilote_fin
        date date_renouvellement
        date date_debut_acces
        int duree_acces_jours
        timestamp created_at
    }

    spots {
        uuid id PK
        uuid client_id FK
        string nom
        string statut
        string pin
        string shortio_url
        string mode_acces
        timestamp created_at
    }

    audios {
        uuid id PK
        uuid musique_suite_id FK
        string nom
        string type
        string voix
        int duree_secondes
        string statut
        timestamp created_at
    }

    audios_traductions {
        uuid id PK
        uuid audio_id FK
        string langue
        string titre
        string description
        string cloudinary_url
        timestamp created_at
    }

    abonnes_b2c {
        uuid id PK
        uuid user_id FK
        uuid parrain_id FK
        uuid spot_origine_id FK
        string email
        string nom
        string statut
        string stripe_customer_id
        string stripe_subscription_id
        string code_parrainage
        string langue_preferee
        timestamp created_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        string stripe_subscription_id
        string statut
        timestamp created_at
    }

    profiles {
        uuid id PK
        string email
        string role
        timestamp created_at
    }

    acces_spots {
        uuid id PK
        uuid spot_id FK
        string uuid_visiteur
        int duree_acces_jours
        timestamp premiere_visite
    }

    ecoutes {
        uuid id PK
        uuid spot_id FK
        uuid audio_id FK
        uuid user_id FK
        string uuid_visiteur
        int duree_ecoute_sec
        timestamp created_at
    }

    spot_audios {
        uuid id PK
        uuid spot_id FK
        uuid audio_id FK
        uuid client_id FK
        bool actif
    }

    client_audios {
        uuid id PK
        uuid client_id FK
        uuid audio_id FK
        bool actif
    }

    filtres {
        uuid id PK
        string nom
        string type
    }

    audio_filtres {
        uuid id PK
        uuid audio_id FK
        uuid filtre_id FK
    }

    contact_requests {
        uuid id PK
        string email
        string statut
        timestamp created_at
    }

    %% Relations B2B
    clients ||--o{ spots : "possède"
    clients ||--o{ client_audios : "accès catalogue"

    %% Relations Spots
    spots ||--o{ spot_audios : "catalogue spot"
    spots ||--o{ acces_spots : "visites"
    spots ||--o{ ecoutes : "écoutes"

    %% Relations Audios
    audios ||--o{ audios_traductions : "traduit en"
    audios ||--o{ spot_audios : "disponible sur"
    audios ||--o{ client_audios : "accordé à"
    audios ||--o{ ecoutes : "écouté via"
    audios ||--o| audios : "musique_suite_id (auto-chain)"
    audios ||--o{ audio_filtres : "catégorisé par"
    filtres ||--o{ audio_filtres : "appliqué à"

    %% Relations B2C
    abonnes_b2c ||--o{ ecoutes : "écoute"
    abonnes_b2c ||--o| abonnes_b2c : "parrain_id (parrainage)"
    abonnes_b2c ||--o| spots : "spot_origine_id (conversion)"
    abonnes_b2c ||--o| profiles : "user_id"
    subscriptions ||--o| profiles : "user_id"
```

## Description des tables

### Cœur B2B
| Table | Rôle |
|---|---|
| `clients` | Établissements partenaires (hôtels, spas, cliniques…) |
| `spots` | Points d'accès physiques (totem, borne) avec QR/NFC |
| `spot_audios` | Catalogue d'audios activés sur un spot donné |
| `client_audios` | Catalogue global accordé à un client B2B |
| `acces_spots` | Suivi des visites par UUID visiteur (cookie) |

### Cœur Audio
| Table | Rôle |
|---|---|
| `audios` | Catalogue maître des méditations/musiques |
| `audios_traductions` | Titre, description et URL Cloudinary par langue |
| `filtres` | Tags de filtrage (type, voix, durée…) |
| `audio_filtres` | Association audio ↔ filtre |

### Cœur B2C
| Table | Rôle |
|---|---|
| `abonnes_b2c` | Abonnés particuliers (Stripe + parrainage) |
| `subscriptions` | Abonnements Stripe actifs |
| `profiles` | Profils auth (rôle admin ou user) |
| `ecoutes` | Historique d'écoutes (analytics) |
| `contact_requests` | Demandes de contact formulaire |

## Fonctions SECURITY DEFINER (RLS)

| Fonction | Rôle |
|---|---|
| `is_admin()` | Vérifie `profiles.role = 'admin'` pour `auth.uid()` |
| `get_spot_public()` | Données spot sans RLS (QR public) |
| `verify_spot_pin()` | Vérification PIN côté serveur |
| `get_spot_catalog()` | Catalogue audio d'un spot |
| `get_audio_public()` | Métadonnées audio publiques |
| `register_spot_visit()` | Enregistre une visite `acces_spots` |
| `handle_new_user()` | Crée le profil à l'inscription |
| `link_abonne_on_signup()` | Lie l'abonné B2C à son compte auth |
