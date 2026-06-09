# Architecture — Backend (`packages/backend`)

API REST Express.js + TypeScript. Point d'entrée : `src/index.ts`.

## Stack

- **Express.js** + **TypeScript** (ESM, `"type": "module"` dans le package backend)
- **Prisma ORM** sur **PostgreSQL**
  - Prod : **Neon serverless** via `@prisma/adapter-neon` + `@neondatabase/serverless` (pool + WebSocket `ws`)
  - Local : PostgreSQL 16 Docker (`docker-compose.yml`)
- **Zod** : validation de toutes les entrées
- **JWT** : authentification
- **dayjs** (UTC) : manipulation des dates
- **Cloudflare R2** (`@aws-sdk/client-s3`) : stockage des images de pièces (`src/lib/r2.ts`)

## Couches

```
src/
├── index.ts            # bootstrap Express, PrismaClient (adapter Neon), montage des routes
├── middleware/
│   ├── auth.ts         # authenticate (JWT), isAdmin, isVendeurOrAdmin
│   ├── tenant.ts       # injectBoutique → req.boutiqueId
│   ├── botProtection.ts# protection anti-bot pour les routes publiques
│   └── rateLimiter.ts  # createRateLimiter({ windowMs, max, message })
├── routes/             # un fichier par domaine (voir table ci-dessous)
├── services/
│   └── stockService.ts # adjustStock() — point unique de modification du stock
├── lib/
│   ├── activityLog.ts  # logActivity() — journal d'audit
│   └── r2.ts           # uploadToR2(), suppression d'objets R2
└── utils/
    ├── decimal.ts      # serializePiece(), serializeFacture() (Decimal → number)
    ├── ensureBoutique.ts# vérifie l'appartenance d'un enregistrement à la boutique
    ├── handleError.ts  # handleRouteError() — mapping Zod / Prisma / générique
    ├── filters.ts      # helpers de filtrage
    ├── generateNumero.ts# numérotation factures/achats/devis/avoirs
    └── xlsx.ts         # génération Excel (exports)
```

## Cycle de vie d'une requête privée

```
Requête /api/<domaine>
  → CORS + express.json()
  → authenticate         (vérifie le JWT, peuple req.user)
  → injectBoutique       (peuple req.boutiqueId depuis req.user)
  → [isVendeurOrAdmin | isAdmin]   (selon la mutation)
  → validation Zod du body
  → logique métier (Prisma, filtré par boutiqueId)
  → effets de bord : adjustStock(), logActivity()
  → sérialisation (serializePiece / serializeFacture)
  → réponse JSON
  (erreur) → handleRouteError(res, error, "contexte")
```

Toutes les routes protégées appliquent `router.use(authenticate, injectBoutique)` en tête de fichier.

## Routes montées (`src/index.ts`)

| Préfixe | Fichier | Accès |
|---|---|---|
| `/api/public` | `public.ts` | **Public** (anti-bot + rate-limit, pas de JWT) |
| `/api/auth` | `auth.ts` | login/register/me + CRUD users |
| `/api/pieces` | `pieces.ts` | CRUD pièces + stock + modèles + remplacement |
| `/api/categories` | `categories.ts` | CRUD catégories / sous-catégories |
| `/api/marques` | `marques.ts` | CRUD marques |
| `/api/fournisseurs` | `fournisseurs.ts` | CRUD fournisseurs |
| `/api/clients` | `clients.ts` | CRUD clients |
| `/api/achats` | `achats.ts` | CRUD achats fournisseurs |
| `/api/factures` | `factures.ts` | CRUD factures + workflow statut |
| `/api/devis` | `devis.ts` | CRUD devis |
| `/api/avoirs` | `avoirs.ts` | CRUD avoirs / retours |
| `/api/inventaires` | `inventaires.ts` | inventaires de stock |
| `/api/mouvements` | `mouvements.ts` | lecture mouvements de stock |
| `/api/dashboard` | `dashboard.ts` | stats, sales-chart, top-pieces, stock-overview |
| `/api/export` | `export.ts` | exports Excel |
| `/api/activity` | `activity.ts` | journal d'activité |
| `/api/boutiques` | `boutiques.ts` | CRUD boutiques (admin) |
| `/api/images` | `images.ts` | upload/suppression images (R2) |
| `/api/ventes-journalieres` | `ventes-journalieres.ts` | saisie des ventes (source CA) |

`/uploads` est servi en statique (`express.static`).

## Routes publiques (storefront)

`src/routes/public.ts` applique `botProtection` globalement, puis des limiteurs distincts par type d'endpoint :

- **Lecture** (catalogue, détail pièce) : 60 req/min
- **Commande** (passage de commande) : 5 req/15 min
- **Mes commandes** : 10 req/min

Chaque endpoint résout la boutique via `getBoutiqueOr404(boutiqueId)` (`actif: true` requis). Les totaux sont calculés avec la même logique que `devis.ts` (`computeItemTotals`).

## Règles invariantes

- **Tenant** : filtrer par `boutiqueId` dans **chaque** requête Prisma, y compris les lectures ; `ensureBoutique()` sur tout `findUnique` avant de retourner/modifier.
- **Stock** : ne jamais écrire `Piece.stock` directement — passer par `adjustStock()` (`stockService.ts`).
- **Activité** : `logActivity()` après chaque POST/PUT/PATCH/DELETE.
- **Transactions** : `prisma.$transaction()` dès qu'une opération touche plusieurs modèles.
- **Numérotation** : `generateNumero()` pour factures/achats/devis/avoirs, jamais à la main.
- **Erreurs** : un seul `try/catch` par handler renvoyant `handleRouteError(res, error, "...")` ; jamais d'erreur Prisma brute exposée.

Voir aussi `.claude/rules/backend.md` pour les règles opérationnelles détaillées.
