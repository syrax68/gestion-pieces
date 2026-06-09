# Architecture — Boutique en ligne (`packages/storefront`)

Boutique en ligne publique React + Vite, destinée aux clients finaux. Ne consomme **que** l'API publique `/api/public/:boutiqueId/*` — aucune authentification JWT.

## Stack

- **React 18** + **TypeScript**, **Vite**
- **Tailwind CSS** (+ `class-variance-authority`, `clsx`, `tailwind-merge`)
- **React Router** (`react-router-dom`)
- **lucide-react** (icônes)

## Structure

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── contexts/
│   └── CartContext.tsx   # état du panier
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── PieceCard.tsx
├── lib/
│   ├── api.ts            # client de l'API publique
│   └── utils.ts
└── pages/
    ├── Catalogue.tsx     # liste des pièces en vente
    ├── PieceDetail.tsx   # fiche pièce
    ├── Cart.tsx          # panier
    ├── Checkout.tsx      # passage de commande
    ├── Confirmation.tsx  # confirmation après commande
    └── MesCommandes.tsx  # suivi des commandes
```

## Connexion à l'API

`src/lib/api.ts` construit l'URL de base ainsi :

```
API_URL  = import.meta.env.VITE_API_URL || "http://localhost:3001/api"
BASE     = `${API_URL}/public/${BOUTIQUE_ID}`
```

Toutes les requêtes ciblent donc `/api/public/:boutiqueId/...`. La boutique est fixée par configuration (`BOUTIQUE_ID` / variable d'environnement Vite) : un storefront = une boutique.

## Contraintes côté serveur

Les routes publiques (`backend/src/routes/public.ts`) imposent :

- **Anti-bot** (`botProtection`) sur toutes les routes publiques.
- **Rate-limiting** différencié : lecture 60/min, commande 5/15 min, mes-commandes 10/min.
- La boutique doit exister et être `actif: true`, sinon 404.

Le storefront ne doit donc jamais supposer un accès illimité : prévoir la gestion des réponses 429 (trop de requêtes) et 404 (boutique inconnue/inactive).

## Build & déploiement

Le storefront est buildé indépendamment (`npm run build:storefront` à la racine, ou `DEPLOY_TARGET=storefront`). Sortie dans `packages/storefront/build/`. Voir [README.md](./README.md) et `DEPLOYMENT.md`.
