# Architecture — Gestion Pièces Moto

Vue d'ensemble de l'architecture du système. Pour les détails par couche, voir les documents liés en bas de page.

## Vision générale

Application de gestion de stock de pièces détachées moto, multi-boutique (multi-tenant), avec **back-office d'administration** et **boutique en ligne publique**, le tout adossé à une API unique.

```
                       ┌──────────────────────────────┐
                       │        Navigateurs            │
                       └──────────────────────────────┘
                          │                      │
          (admin/vendeur) │                      │ (clients)
                          ▼                      ▼
            ┌───────────────────────┐  ┌────────────────────────┐
            │  frontend (BO admin)  │  │  storefront (boutique) │
            │  React + Vite         │  │  React + Vite          │
            │  JWT, multi-rôles     │  │  panier, commandes     │
            └───────────────────────┘  └────────────────────────┘
                          │                      │
              /api/* (JWT)│                      │ /api/public/:boutiqueId
                          ▼                      ▼
            ┌──────────────────────────────────────────────────┐
            │              backend (Express + TS)               │
            │  Auth JWT · middleware tenant · Zod · Prisma      │
            │  rate-limit + anti-bot sur /api/public            │
            └──────────────────────────────────────────────────┘
                  │                         │
                  ▼                         ▼
       ┌────────────────────┐    ┌──────────────────────┐
       │  PostgreSQL        │    │  Cloudflare R2        │
       │  (Neon serverless  │    │  (images pièces)      │
       │   en prod / Docker │    └──────────────────────┘
       │   en local)        │
       └────────────────────┘
```

## Monorepo (pnpm workspaces)

Le dépôt est un monorepo `pnpm` avec quatre packages sous `packages/` :

| Package | Rôle | Stack | Public visé |
|---|---|---|---|
| `backend` | API REST unique | Express.js + TypeScript, Prisma, Zod, JWT | — |
| `frontend` | Back-office d'administration | React 18 + Vite, Tailwind + shadcn/ui, Recharts | Admin, vendeurs, lecteurs |
| `storefront` | Boutique en ligne publique | React 18 + Vite, Tailwind | Clients finaux |
| `shared` | Placeholder (vide actuellement) | — | — |

Le `package.json` racine ne déclare que `packages/backend` dans `workspaces` ; `frontend` et `storefront` sont installés/buildés indépendamment via leurs propres scripts npm (voir `build:frontend`, `build:storefront`).

## Principes transverses

- **Multi-tenant** : chaque entité porte un `boutiqueId`. Le middleware `injectBoutique` l'injecte dans `req.boutiqueId` à partir du JWT, et toutes les requêtes Prisma filtrent dessus. Voir [backend.md](./backend.md).
- **Source de vérité des ventes** : `VenteJournaliere` (saisie manuelle), pas `Facture`. Voir [data-model.md](./data-model.md).
- **Pas de TVA** : les champs `tva` valent toujours 0, aucun calcul de TVA nulle part.
- **Dates UTC** : `dayjs.utc()` côté backend pour les bornes de requêtes, `dayjs()` côté front pour le formatage.
- **Décimaux** : montants en `Decimal(10,2)` côté Prisma, sérialisés en `number` avant envoi HTTP.

## Surface publique vs privée

L'API expose deux familles de routes montées dans `packages/backend/src/index.ts` :

- **Privée** (`/api/*`) — consommée par le back-office. Chaîne `authenticate → injectBoutique → handler`, JWT obligatoire.
- **Publique** (`/api/public/:boutiqueId/*`) — consommée par la boutique en ligne. Pas de JWT, mais protection anti-bot (`botProtection`) et rate-limiting (`createRateLimiter`) sur chaque endpoint. La boutique cible est identifiée par le `boutiqueId` dans l'URL et doit être `actif: true`.

## Déploiement

Hébergé sur Hostinger. Point d'entrée `server.js` (CommonJS) qui charge dynamiquement le bundle ESM `packages/backend/dist/index.js`. Process managé par PM2 (`ecosystem.config.js`), reverse-proxy nginx (`nginx.conf`). Le build est piloté par la variable `DEPLOY_TARGET` (`storefront` vs backend) dans le script `build` racine. Détails complets dans `DEPLOYMENT.md` et `GUIDE-MISE-EN-LIGNE.md` à la racine.

## Documents liés

- [backend.md](./backend.md) — couches, cycle de vie d'une requête, middleware, services
- [frontend-admin.md](./frontend-admin.md) — back-office d'administration
- [storefront.md](./storefront.md) — boutique en ligne publique
- [data-model.md](./data-model.md) — modèles Prisma, relations, enums
