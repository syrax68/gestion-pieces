# Gestion Pièces Moto

Application complète de gestion de stock de pièces détachées pour motos, scooters et quads. Monorepo full-stack avec backend API REST et frontend SPA.

## 📦 Stack technique

| Couche              | Technologies                                                  |
| ------------------- | ------------------------------------------------------------- |
| **Frontend**        | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts |
| **Backend**         | Node.js, Express, TypeScript, Prisma ORM, Zod                 |
| **Base de données** | PostgreSQL 16 (Docker)                                        |
| **Auth**            | JWT (jsonwebtoken) + bcryptjs                                 |
| **Monorepo**        | pnpm workspaces                                               |
| **Outils**          | Docker Compose, pgAdmin, tsx (dev), xlsx (exports)            |

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** >= 18
- **pnpm** >= 8
- **Docker** & **Docker Compose**

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd gestion-pieces-moto
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Démarrer la base de données

```bash
pnpm db:up
```

Cela lance PostgreSQL (port `5433`) et pgAdmin (port `5050`) via Docker Compose.

### 4. Configurer les variables d'environnement

Créer un fichier `packages/backend/.env` :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/gestion_moto?schema=public"
JWT_SECRET="votre-secret-jwt"
PORT=3001
```

### 5. Appliquer les migrations et le seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 6. Lancer en mode développement

```bash
pnpm dev
```

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| pgAdmin     | http://localhost:5050 |

## 📜 Scripts disponibles (racine)

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Lance le frontend et le backend en parallèle |
| `pnpm dev:frontend` | Lance uniquement le frontend                 |
| `pnpm dev:backend`  | Lance uniquement le backend                  |
| `pnpm build`        | Build tous les packages                      |
| `pnpm lint`         | Lint tous les packages                       |
| `pnpm db:up`        | Démarre PostgreSQL + pgAdmin (Docker)        |
| `pnpm db:down`      | Arrête les conteneurs Docker                 |
| `pnpm db:migrate`   | Applique les migrations Prisma               |
| `pnpm db:seed`      | Seed la base de données                      |
| `pnpm db:studio`    | Ouvre Prisma Studio                          |

## 🏗️ Structure du projet

```
gestion-pieces-moto/
├── docker-compose.yml          # PostgreSQL 16 + pgAdmin
├── package.json                # Scripts monorepo
├── pnpm-workspace.yaml         # Configuration pnpm workspaces
│
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 20+ modèles de données
│   │   │   ├── seed.ts         # Données initiales
│   │   │   └── *.ts            # Scripts utilitaires
│   │   └── src/
│   │       ├── index.ts        # Point d'entrée Express
│   │       ├── middleware/
│   │       │   └── auth.ts     # Middleware JWT
│   │       ├── routes/
│   │       │   ├── auth.ts         # Authentification
│   │       │   ├── pieces.ts       # CRUD pièces
│   │       │   ├── categories.ts   # Catégories
│   │       │   ├── marques.ts      # Marques
│   │       │   ├── fournisseurs.ts # Fournisseurs
│   │       │   ├── clients.ts      # Clients
│   │       │   ├── commandes.ts    # Commandes fournisseurs
│   │       │   ├── achats.ts       # Achats
│   │       │   ├── factures.ts     # Facturation
│   │       │   ├── mouvements.ts   # Mouvements de stock
│   │       │   ├── dashboard.ts    # Statistiques
│   │       │   ├── export.ts       # Export Excel
│   │       │   └── activity.ts     # Journal d'activité
│   │       ├── services/
│   │       │   └── stockService.ts # Logique métier stock
│   │       ├── lib/
│   │       │   └── activityLog.ts  # Journalisation
│   │       └── utils/
│   │           ├── decimal.ts      # Utilitaires Decimal
│   │           ├── filters.ts      # Filtres de recherche
│   │           ├── generateNumero.ts # Génération de numéros
│   │           ├── handleError.ts  # Gestion d'erreurs
│   │           └── xlsx.ts         # Génération Excel
│   │
│   ├── frontend/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx             # Routes & layout
│   │       ├── main.tsx            # Point d'entrée
│   │       ├── index.css           # Styles globaux
│   │       ├── contexts/
│   │       │   └── AuthContext.tsx  # Contexte d'authentification
│   │       ├── lib/
│   │       │   ├── api.ts          # Client API (fetch)
│   │       │   ├── storage.ts      # Stockage local
│   │       │   └── utils.ts        # Utilitaires (cn, etc.)
│   │       ├── types/
│   │       │   └── index.ts        # Types TypeScript partagés
│   │       ├── components/
│   │       │   ├── Layout.tsx      # Layout principal (sidebar + header)
│   │       │   ├── PieceForm.tsx   # Formulaire de pièce
│   │       │   └── ui/            # Composants UI réutilisables
│   │       │       ├── Autocomplete.tsx
│   │       │       ├── Badge.tsx
│   │       │       ├── Button.tsx
│   │       │       ├── Card.tsx
│   │       │       ├── Dialog.tsx
│   │       │       ├── Input.tsx
│   │       │       ├── Label.tsx
│   │       │       ├── Select.tsx
│   │       │       └── Textarea.tsx
│   │       └── pages/
│   │           ├── Dashboard.tsx       # Tableau de bord & KPIs
│   │           ├── PiecesList.tsx      # Liste des pièces
│   │           ├── PieceDetails.tsx    # Détail d'une pièce
│   │           ├── StockManagement.tsx # Gestion de stock
│   │           ├── Commandes.tsx       # Commandes fournisseurs
│   │           ├── Achats.tsx          # Achats
│   │           ├── Factures.tsx        # Factures clients
│   │           ├── Login.tsx           # Page de connexion
│   │           ├── Users.tsx           # Gestion utilisateurs (admin)
│   │           └── Activity.tsx        # Journal d'activité
│   │
│   └── shared/                     # (réservé — package partagé)
```

## 🗄️ Modèle de données

Le schéma Prisma comporte **20+ modèles** organisés par domaine :

### Utilisateurs & Sécurité

- **User** — utilisateurs avec rôles (`ADMIN`, `VENDEUR`, `LECTEUR`)

### Catalogue Produits

- **Piece** — pièces détachées (référence, code-barres, prix achat/vente, stock, TVA, promo…)
- **Categorie** / **SousCategorie** — arborescence de catégories
- **Marque** — marques constructeur
- **Image** — images produit
- **Emplacement** — emplacements de stockage (ex: `A1-B3`)

### Véhicules Compatibles

- **ModeleVehicule** — modèles de véhicules (MOTO, SCOOTER, QUAD)
- **PieceModeleVehicule** — table de liaison pièce ↔ modèle

### Stock & Entrepôt

- **MouvementStock** — entrées, sorties, ajustements, retours, transferts, inventaires
- **Inventaire** / **InventaireItem** — sessions d'inventaire physique

### Fournisseurs & Achats

- **Fournisseur** — coordonnées, SIRET, TVA, conditions de paiement
- **PieceFournisseur** — prix par fournisseur, fournisseur principal
- **Commande** / **CommandeItem** — commandes fournisseur (brouillon → livrée)
- **Achat** / **AchatItem** — factures d'achat

### Clients & Ventes

- **Client** — particuliers et professionnels
- **Devis** / **DevisItem** — devis avec date de validité
- **Facture** / **FactureItem** — facturation complète (TVA, remises, paiement partiel)
- **Avoir** / **AvoirItem** — avoirs et retours

### Historique & Analytics

- **ActivityLog** — journal d'activité (création, modification, suppression…)
- **HistoriquePrix** — historique des changements de prix

## 🎨 Fonctionnalités

### Gestion des pièces

- CRUD complet des pièces avec référence, code-barres, prix, stock
- Catégorisation par catégorie/sous-catégorie et marque
- Compatibilité véhicule (motos, scooters, quads)
- Gestion des emplacements de stockage
- Alertes de stock minimum

### Gestion commerciale

- **Commandes fournisseurs** — workflow complet (brouillon → livrée)
- **Achats** — suivi des factures d'achat
- **Factures clients** — génération avec TVA, remises, suivi de paiement
- **Devis** — création avec date de validité et conversion en facture
- **Avoirs** — gestion des retours et remboursements

### Stock

- Mouvements de stock (entrées, sorties, ajustements, retours, transferts)
- Inventaires physiques
- Historique complet des mouvements

### Tableau de bord

- KPIs et statistiques en temps réel
- Graphiques (Recharts)

### Administration

- Authentification JWT avec 3 niveaux de rôles
- Routes protégées (frontend) et middleware d'auth (backend)
- Gestion des utilisateurs (admin uniquement)
- Journal d'activité complet
- Export Excel (xlsx)

## 🔌 API REST

Toutes les routes sont préfixées par `/api` :

| Endpoint            | Description                    |
| ------------------- | ------------------------------ |
| `/api/auth`         | Inscription, connexion, profil |
| `/api/pieces`       | CRUD pièces détachées          |
| `/api/categories`   | Catégories de pièces           |
| `/api/marques`      | Marques constructeur           |
| `/api/fournisseurs` | Fournisseurs                   |
| `/api/clients`      | Clients                        |
| `/api/commandes`    | Commandes fournisseurs         |
| `/api/achats`       | Achats / factures fournisseur  |
| `/api/factures`     | Facturation client             |
| `/api/mouvements`   | Mouvements de stock            |
| `/api/dashboard`    | Statistiques & KPIs            |
| `/api/export`       | Exports Excel                  |
| `/api/activity`     | Journal d'activité             |
| `/api/health`       | Health check                   |

## 🐳 Docker

Le fichier `docker-compose.yml` fournit :

- **PostgreSQL 16 Alpine** — port `5433` (pour éviter les conflits avec une instance locale)
  - User: `postgres` / Password: `postgres` / DB: `gestion_moto`
- **pgAdmin 4** — port `5050`
  - Email: `admin@admin.com` / Password: `admin`

```bash
# Démarrer
pnpm db:up

# Arrêter
pnpm db:down
```

## 📝 Licence

MIT
