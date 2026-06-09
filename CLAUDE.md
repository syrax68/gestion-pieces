# CLAUDE.md - Référence projet Gestion Pièces Moto

<!-- Rules détaillées -->
@.claude/rules/backend.md
@.claude/rules/frontend.md
@.claude/rules/database.md

<!-- Documentation d'architecture -->
@docs/architecture/README.md

## Documentation d'architecture

Doc détaillée dans `docs/architecture/` :

- [README.md](docs/architecture/README.md) — vue d'ensemble + diagramme système + monorepo
- [backend.md](docs/architecture/backend.md) — couches, cycle de vie d'une requête, routes, middleware
- [frontend-admin.md](docs/architecture/frontend-admin.md) — back-office d'administration
- [storefront.md](docs/architecture/storefront.md) — boutique en ligne publique
- [data-model.md](docs/architecture/data-model.md) — modèles Prisma, relations, enums

## Stack technique
- **Monorepo pnpm** — 4 packages : `packages/backend`, `packages/frontend` (back-office admin), `packages/storefront` (boutique publique), `packages/shared` (vide actuellement)
- **Backend**: Express.js + TypeScript (ESM), Prisma ORM, JWT auth, Zod validation, **dayjs** (dates UTC)
- **Frontend (admin)**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui, Recharts, React Router, **dayjs**, html2pdf.js
- **Storefront (public)**: React 18 + TypeScript, Vite, Tailwind CSS, React Router, lucide-react
- **Base de données**: PostgreSQL — **Neon serverless** en prod (`@prisma/adapter-neon` + `@neondatabase/serverless` + `ws`), **Docker** (`docker-compose.yml`) + pgAdmin en local
- **Stockage images**: Cloudflare R2 (`@aws-sdk/client-s3`, `src/lib/r2.ts`)
- **Port backend**: 3001 | **Port frontend**: 5173

## Règles métier importantes

> **Pas de TVA** : le site ne gère pas la TVA. Les champs `tva` présents dans le schéma Prisma valent toujours 0. Ne jamais ajouter de calcul TVA dans les routes ou l'interface.

> **Dates** : toujours utiliser `dayjs.utc()` côté backend pour les bornes de requêtes Prisma. Côté frontend, `dayjs()` suffit pour le formatage. Ne jamais utiliser `new Date()` avec des opérations sur les mois/années (décalage fuseau horaire).

> **Source ventes** : les ventes sont trackées via `VenteJournaliere` (saisie manuelle). Les `Facture` existent dans le schéma mais ne sont pas la source principale de CA pour le dashboard opérationnel. Ne pas mélanger les deux dans les calculs (voir la section « Calcul du chiffre d'affaires »).

## Structure des fichiers

```
packages/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Schéma complet (~600 lignes, 25 modèles)
│   │   ├── seed.ts                # Données initiales (boutique, users, pièces)
│   │   ├── migrations-scripts/    # Scripts migration (add-boutique.ts)
│   │   ├── import-pieces-janvier.ts
│   │   └── import-jacks.ts
│   └── src/
│       ├── index.ts               # Point d'entrée Express, PrismaClient, routes
│       ├── middleware/
│       │   ├── auth.ts            # JWT authenticate, isAdmin, isVendeurOrAdmin
│       │   ├── tenant.ts         # injectBoutique → req.boutiqueId
│       │   ├── botProtection.ts  # Protection anti-bot (routes publiques)
│       │   └── rateLimiter.ts    # createRateLimiter({ windowMs, max, message })
│       ├── routes/
│       │   ├── public.ts          # API boutique publique /api/public/:boutiqueId (anti-bot + rate-limit, sans JWT)
│       │   ├── auth.ts            # Login, register, /me, users CRUD
│       │   ├── dashboard.ts       # Stats, sales-chart, top-pieces, stock-overview, kpi, multi-boutique
│       │   ├── pieces.ts          # CRUD pièces + stock + import/parse-invoice/bulk-update + remplacer
│       │   ├── factures.ts        # CRUD factures + workflow statut + stock
│       │   ├── devis.ts           # CRUD devis
│       │   ├── avoirs.ts          # CRUD avoirs / retours
│       │   ├── achats.ts          # CRUD achats fournisseurs
│       │   ├── inventaires.ts     # Inventaires de stock
│       │   ├── ventes-journalieres.ts # Saisie des ventes (source CA opérationnel)
│       │   ├── clients.ts         # CRUD clients
│       │   ├── fournisseurs.ts    # CRUD fournisseurs
│       │   ├── categories.ts      # CRUD catégories + sous-catégories
│       │   ├── marques.ts         # CRUD marques
│       │   ├── images.ts          # Upload / suppression images (R2)
│       │   ├── mouvements.ts      # Lecture mouvements stock
│       │   ├── boutiques.ts       # CRUD boutiques (admin only)
│       │   ├── activity.ts        # Journal d'activité
│       │   └── export.ts          # Export Excel (pieces, factures, mouvements)
│       ├── services/
│       │   └── stockService.ts    # adjustStock() centralisé
│       ├── utils/
│       │   ├── ensureBoutique.ts  # Vérifie appartenance boutique
│       │   ├── handleError.ts     # handleRouteError()
│       │   ├── decimal.ts         # serializePiece(), serializeFacture()
│       │   ├── filters.ts         # Helpers filtrage
│       │   ├── generateNumero.ts  # Génération numéros factures/achats/devis/avoirs
│       │   └── xlsx.ts            # Utilitaires Excel
│       └── lib/
│           ├── activityLog.ts     # logActivity() centralisé
│           └── r2.ts              # uploadToR2() — stockage images Cloudflare R2
│
├── frontend/                     # Back-office admin
│   └── src/
│       ├── App.tsx                # Routes : /, /pieces, /stock, /achats, /factures, /clients, /fournisseurs, /activite, /users (admin)
│       ├── main.tsx               # Point d'entrée React
│       ├── contexts/
│       │   └── AuthContext.tsx     # Auth state, user, boutique, roles (isAdmin, canEdit, canDelete)
│       ├── lib/
│       │   ├── api.ts             # Client API complet : types + endpoints (authApi, piecesApi, facturesApi, dashboardApi, boutiquesApi, etc.)
│       │   ├── utils.ts           # Utilitaires (formatCurrency, cn, etc.)
│       │   └── storage.ts         # LocalStorage helpers
│       ├── types/
│       │   └── index.ts           # Types partagés
│       ├── components/
│       │   ├── Layout.tsx         # Header + nav (sidebar desktop/mobile) + boutique name
│       │   ├── PieceForm.tsx      # Formulaire pièce
│       │   ├── ReplacePieceDialog.tsx
│       │   └── ui/               # shadcn/ui : Card, Button, Badge, Dialog, Input, Select, Label, Textarea, Autocomplete
│       └── pages/
│           ├── Dashboard.tsx      # KPIs, graphique 12 mois, top pièces, stock, activité
│           ├── PiecesList.tsx     # Liste pièces avec recherche/filtre
│           ├── PieceDetails.tsx   # Détail pièce + historique prix + compatibilité
│           ├── StockManagement.tsx # Gestion stock
│           ├── Inventaires.tsx     # Inventaires de stock
│           ├── Factures.tsx       # Factures CRUD + workflow statut
│           ├── Devis.tsx          # Devis CRUD
│           ├── Avoirs.tsx         # Avoirs / retours
│           ├── Achats.tsx         # Achats fournisseurs
│           ├── Clients.tsx        # Gestion clients
│           ├── Fournisseurs.tsx   # Gestion fournisseurs
│           ├── Activity.tsx       # Journal d'activité avec filtres
│           ├── Users.tsx          # Gestion utilisateurs (admin)
│           ├── Boutiques.tsx      # CRUD boutiques (super_admin)
│           ├── DashboardMultiBoutique.tsx # Comparaison CA multi-boutiques (super_admin)
│           └── Login.tsx          # Page connexion
│
├── storefront/                   # Boutique en ligne publique (clients)
│   └── src/
│       ├── App.tsx, main.tsx
│       ├── contexts/CartContext.tsx   # État du panier
│       ├── components/            # Navbar, Footer, PieceCard
│       ├── lib/api.ts            # Client API publique → /api/public/:boutiqueId
│       └── pages/                # Catalogue, PieceDetail, Cart, Checkout, Confirmation, MesCommandes
│
└── shared/                       # Placeholder (vide actuellement)
```

## Architecture multi-boutique (multi-tenant)

### Principe
- Chaque entité (Piece, Facture, Client, etc.) a un champ `boutiqueId`
- Le middleware `injectBoutique` extrait le `boutiqueId` de l'utilisateur connecté et l'injecte dans `req.boutiqueId`
- Toutes les requêtes Prisma filtrent par `boutiqueId`
- `ensureBoutique()` vérifie qu'un enregistrement appartient à la boutique de l'utilisateur

### Chaîne middleware
```
authenticate → injectBoutique → route handler
```
Toutes les routes protégées utilisent : `router.use(authenticate, injectBoutique)`

### Rôles utilisateurs
- `SUPER_ADMIN` : accès complet + gestion boutiques + dashboard multi-boutiques + gestion utilisateurs cross-boutique
- `ADMIN` : accès complet à sa boutique + gestion utilisateurs de sa boutique
- `VENDEUR` : CRUD pièces, factures, clients, stock
- `LECTEUR` : lecture seule

## Modèles Prisma principaux

25 modèles au total. Référence complète : [docs/architecture/data-model.md](docs/architecture/data-model.md).

| Modèle | Rôle | Relations clés |
|--------|------|----------------|
| **Boutique** | Tenant | → users, pieces, factures, clients, etc. |
| **User** | Utilisateur | → boutique, factures, mouvements |
| **Piece** | Pièce détachée | → marque, categorie, sousCategorie, emplacement, images, fournisseurs |
| **Image** | Image de pièce (R2) | → piece |
| **Emplacement** | Emplacement physique de stock | → pieces |
| **Facture** / **FactureItem** | Vente | → client, createur, items → piece |
| **Devis** / **DevisItem** | Devis | → client, items → piece |
| **Avoir** / **AvoirItem** | Avoir/retour | → client, facture |
| **Achat** / **AchatItem** | Achat fournisseur | → fournisseur, items → piece |
| **VenteJournaliere** | Vente quotidienne (source CA opérationnel) | → boutique |
| **Client** | Client | → factures, devis, avoirs |
| **Fournisseur** | Fournisseur | → pieces, achats |
| **PieceFournisseur** | Liaison pièce ↔ fournisseur | → piece, fournisseur |
| **MouvementStock** | Mouvement stock | → piece, user, boutique |
| **Inventaire** / **InventaireItem** | Inventaire | → items → piece |
| **Categorie** / **SousCategorie** | Classification | → pieces |
| **Marque** | Marque | → pieces |
| **HistoriquePrix** | Historique des prix d'une pièce | → piece |
| **ActivityLog** | Journal audit | → user, boutique |

## Enums
- `Role`: SUPER_ADMIN, ADMIN, VENDEUR, LECTEUR
- `StatutFacture`: BROUILLON, EN_ATTENTE, PAYEE, PARTIELLEMENT_PAYEE, ANNULEE
- `StatutDevis`: BROUILLON, ENVOYE, ACCEPTE, REFUSE, EXPIRE
- `StatutAvoir`: EN_ATTENTE, VALIDE, REMBOURSE
- `TypeMouvement`: ENTREE, SORTIE, AJUSTEMENT, INVENTAIRE, RETOUR, TRANSFERT
- `StatutInventaire`: EN_COURS, VALIDE, ANNULE

## Calcul du chiffre d'affaires
La source dépend de l'endpoint :
- **Dashboard opérationnel** (`/dashboard/stats`, `/sales-chart`, `/kpi`) : basé sur `VenteJournaliere.montant` (saisie manuelle). `todaySales` = ventes du jour, `monthlySales` = ventes du mois, `sales-chart` = 12 derniers mois.
- **Dashboard multi-boutiques** (`/dashboard/multi-boutique`, super_admin) : basé sur `Facture.total`.
- **Top pièces** (`/top-pieces`) : agrégé depuis `FactureItem` (30 derniers jours).

## API endpoints (base: /api)
- `/public/:boutiqueId` : **boutique publique** (catalogue, détail, commande, mes-commandes) — anti-bot + rate-limit, sans JWT
- `/auth` : login, register, me, users
- `/pieces` : CRUD + /:id/stock + /:id/remplacer + /import + /parse-invoice + /bulk-update
- `/factures` : CRUD + /statut (PATCH)
- `/devis`, `/avoirs` : CRUD
- `/achats` : CRUD + /statut
- `/inventaires` : inventaires de stock
- `/ventes-journalieres` : saisie des ventes (source CA opérationnel)
- `/clients`, `/fournisseurs`, `/categories`, `/marques` : CRUD standard
- `/images` : upload / suppression (R2)
- `/mouvements` : lecture
- `/dashboard` : /stats, /recent, /low-stock, /sales-chart, /top-pieces, /stock-overview, /kpi, /activity-summary, /multi-boutique
- `/boutiques` : CRUD (admin only)
- `/activity` : journal avec filtres
- `/export` : /pieces, /factures, /mouvements (Excel)

## Frontend API client (api.ts)
Toutes les fonctions API sont dans `packages/frontend/src/lib/api.ts` :
- `authApi`, `piecesApi`, `categoriesApi`, `marquesApi`, `fournisseursApi`, `clientsApi`
- `facturesApi`, `devisApi`, `avoirsApi`, `achatsApi`, `inventairesApi`, `ventesJournalieresApi`
- `mouvementsApi`, `dashboardApi`, `activityApi`, `imagesApi`, `boutiquesApi`, `exportApi`

> Le storefront a son propre client dans `packages/storefront/src/lib/api.ts` (base `/api/public/:boutiqueId`).

## Conventions
- Monnaie : `Decimal(10,2)` côté Prisma, sérialisé en `number` via `serializePiece()`/`serializeFacture()`
- Validation : schémas Zod sur toutes les entrées
- Activité : `logActivity()` après chaque mutation
- Stock : `adjustStock()` dans `stockService.ts` pour toute modification
- Transactions : `prisma.$transaction()` pour opérations multi-étapes
- Numérotation : `generateNumero()` pour factures, achats, devis, avoirs

## Commandes utiles
```bash
# Démarrer la base de données
docker compose up -d

# Backend
cd packages/backend && pnpm dev

# Frontend admin (port 5173)
cd packages/frontend && pnpm dev

# Storefront public (port 5174)
cd packages/storefront && pnpm dev

# Prisma
cd packages/backend && npx prisma studio    # Explorer la BDD
cd packages/backend && npx prisma migrate dev  # Migrations
cd packages/backend && npx prisma db seed   # Seed
```
