# Règles Base de données

## Schéma Prisma

### Tout nouveau modèle doit avoir :
- `id String @id @default(cuid())` — jamais d'UUID ou auto-increment
- `boutiqueId String` + relation `Boutique` — toujours multi-tenant
- `@@index([boutiqueId])` — obligatoire pour les performances
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

### Conventions de nommage
- Modèles : PascalCase singulier (`FactureItem`, `MouvementStock`)
- Champs : camelCase (`dateFacture`, `prixUnitaire`)
- Relations : nom du modèle en camelCase (`factureItems`, `mouvementStocks`)
- Tables Prisma : générées automatiquement, ne pas spécifier `@@map` sauf nécessité

### Champs Decimal
- Prix, montants, taux : `Decimal(10, 2)` — **jamais** `Float`
- Sérialiser via `serializePiece()` / `serializeFacture()` avant envoi HTTP

## Migrations

### Règles
- Un seul sujet par migration — ne pas mélanger ajout de modèle et modification d'index
- Noms descriptifs en kebab-case : `add-inventaire-model`, `add-piece-emplacement`
- Ne jamais modifier une migration déjà appliquée en production — créer une nouvelle

### Environnements
- **Local** : `npx prisma migrate dev` (Docker PostgreSQL)
- **Production Neon** : `npx prisma migrate deploy` (ne pas utiliser `dev` en prod)

## Requêtes Prisma

### Bonnes pratiques
- Toujours `select` ou `include` explicite — éviter de ramener tous les champs inutilement
- Utiliser `prisma.$transaction()` pour les opérations multi-étapes atomiques
- `findFirst` + `where boutiqueId` plutôt que `findUnique` quand l'unicité n'est que par boutique
- Pagination obligatoire pour les listes potentiellement grandes (`take`, `skip`)
