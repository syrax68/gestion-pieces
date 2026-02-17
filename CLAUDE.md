# CLAUDE.md - Référence projet Gestion Pièces Moto

## Stack technique
- **Monorepo pnpm** avec `packages/backend` et `packages/frontend`
- **Backend**: Express.js + TypeScript, Prisma ORM, PostgreSQL 16 (Docker), JWT auth, Zod validation
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui, Recharts, React Router
- **Base de données**: PostgreSQL 16 Alpine via `docker-compose.yml` + pgAdmin
- **Port backend**: 3001 | **Port frontend**: 5173

## Structure des fichiers

```
packages/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Schéma complet (710 lignes, 25+ modèles)
│   │   ├── seed.ts                # Données initiales (boutique, users, pièces)
│   │   ├── migrations-scripts/    # Scripts migration (add-boutique.ts)
│   │   ├── import-pieces-janvier.ts
│   │   └── import-jacks.ts
│   └── src/
│       ├── index.ts               # Point d'entrée Express, PrismaClient, routes
│       ├── middleware/
│       │   ├── auth.ts            # JWT authenticate, isAdmin, isVendeurOrAdmin
│       │   └── tenant.ts         # injectBoutique → req.boutiqueId
│       ├── routes/
│       │   ├── auth.ts            # Login, register, /me, users CRUD
│       │   ├── dashboard.ts       # Stats, sales-chart, top-pieces, stock-overview
│       │   ├── pieces.ts          # CRUD pièces + stock adjust + compatibilité
│       │   ├── factures.ts        # CRUD factures + workflow statut + stock
│       │   ├── achats.ts          # CRUD achats fournisseurs
│       │   ├── clients.ts         # CRUD clients
│       │   ├── fournisseurs.ts    # CRUD fournisseurs
│       │   ├── categories.ts      # CRUD catégories + sous-catégories
│       │   ├── marques.ts         # CRUD marques
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
│       │   ├── generateNumero.ts  # Génération numéros factures/achats
│       │   └── xlsx.ts            # Utilitaires Excel
│       └── lib/
│           └── activityLog.ts     # logActivity() centralisé
│
├── frontend/
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
│           ├── StockManagement.tsx # Gestion stock + inventaires
│           ├── Factures.tsx       # Factures CRUD + workflow statut
│           ├── Achats.tsx         # Achats fournisseurs
│           ├── Clients.tsx        # Gestion clients
│           ├── Fournisseurs.tsx   # Gestion fournisseurs
│           ├── Activity.tsx       # Journal d'activité avec filtres
│           ├── Users.tsx          # Gestion utilisateurs (admin)
│           ├── Boutiques.tsx      # CRUD boutiques (super_admin)
│           ├── DashboardMultiBoutique.tsx # Comparaison CA multi-boutiques (super_admin)
│           └── Login.tsx          # Page connexion
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

| Modèle | Rôle | Relations clés |
|--------|------|----------------|
| **Boutique** | Tenant | → users, pieces, factures, clients, etc. |
| **User** | Utilisateur | → boutique, factures, mouvements |
| **Piece** | Pièce détachée | → marque, categorie, fournisseur, emplacement |
| **Facture** / **FactureItem** | Vente | → client, createur, items → piece |
| **Achat** / **AchatItem** | Achat fournisseur | → fournisseur, items → piece |
| **Client** | Client | → factures, devis, avoirs |
| **Fournisseur** | Fournisseur | → pieces, achats |
| **MouvementStock** | Mouvement stock | → piece, user, boutique |
| **Categorie** / **SousCategorie** | Classification | → pieces |
| **Marque** | Marque | → pieces, modelesVehicule |
| **Devis** / **DevisItem** | Devis | → client, items |
| **Avoir** / **AvoirItem** | Avoir/retour | → client, facture |
| **ActivityLog** | Journal audit | → user, boutique |

## Enums
- `Role`: SUPER_ADMIN, ADMIN, VENDEUR, LECTEUR
- `StatutFacture`: BROUILLON, EN_ATTENTE, PAYEE, PARTIELLEMENT_PAYEE, ANNULEE
- `StatutDevis`: BROUILLON, ENVOYE, ACCEPTE, REFUSE, EXPIRE
- `StatutAvoir`: EN_ATTENTE, VALIDE, REMBOURSE
- `TypeMouvement`: ENTREE, SORTIE, AJUSTEMENT, INVENTAIRE, RETOUR, TRANSFERT
- `TypeVehicule`: MOTO, SCOOTER, QUAD, AUTRE

## Calcul du chiffre d'affaires
- Basé sur `Facture.total` avec statuts `PAYEE`, `EN_ATTENTE`, `PARTIELLEMENT_PAYEE`
- `todaySales` : factures du jour
- `monthlySales` : factures du mois en cours
- `sales-chart` : 12 derniers mois, itération mois par mois

## API endpoints (base: /api)
- `/auth` : login, register, me, users
- `/pieces` : CRUD + /stock + /modeles + /remplacer
- `/factures` : CRUD + /statut (PATCH)
- `/achats` : CRUD + /statut
- `/clients`, `/fournisseurs`, `/categories`, `/marques` : CRUD standard
- `/mouvements` : lecture
- `/dashboard` : /stats, /recent, /low-stock, /sales-chart, /top-pieces, /stock-overview, /activity-summary
- `/boutiques` : CRUD (admin only)
- `/activity` : journal avec filtres
- `/export` : /pieces, /factures, /mouvements (Excel)

## Frontend API client (api.ts)
Toutes les fonctions API sont dans `packages/frontend/src/lib/api.ts` :
- `authApi`, `piecesApi`, `categoriesApi`, `marquesApi`, `fournisseursApi`, `clientsApi`
- `facturesApi`, `achatsApi`, `mouvementsApi`, `dashboardApi`, `activityApi`
- `boutiquesApi`, `exportApi`

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

# Frontend
cd packages/frontend && pnpm dev

# Prisma
cd packages/backend && npx prisma studio    # Explorer la BDD
cd packages/backend && npx prisma migrate dev  # Migrations
cd packages/backend && npx prisma db seed   # Seed
```
