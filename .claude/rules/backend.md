# Règles Backend

## Sécurité tenant (CRITIQUE)
- **Toujours** filtrer par `boutiqueId` dans chaque requête Prisma — même pour les lectures
- Utiliser `ensureBoutique(entity, boutiqueId)` sur tout `findUnique` avant de retourner/modifier la donnée
- Ne jamais exposer de données cross-boutique sauf pour `SUPER_ADMIN` avec vérification explicite

## Gestion des erreurs
- Chaque handler = `try { ... } catch (error) { handleRouteError(res, error, "description") }`
- Ne pas laisser passer des erreurs Prisma brutes au client
- `handleRouteError` gère Zod, Prisma P2002 (unique), P2025 (not found), et les erreurs génériques

## Mutations et effets de bord
- Stock : toujours passer par `adjustStock()` dans `stockService.ts`, jamais mettre à jour `Piece.stock` directement
- Activité : `logActivity()` obligatoire après chaque POST, PUT, PATCH, DELETE
- Transactions : utiliser `prisma.$transaction()` dès qu'une opération touche plusieurs modèles

## Validation
- Schéma Zod défini en haut de chaque fichier route
- Utiliser `.parse()` (lance une exception → catch) ou `.safeParse()` (retour `{ success, error }`)
- Ne jamais faire confiance à `req.body` sans validation Zod

## Numérotation
- Factures, achats, devis, avoirs : toujours utiliser `generateNumero()` de `utils/generateNumero.ts`
- Ne jamais générer un numéro manuellement

## Autorisation
- Middleware chain : `authenticate → injectBoutique → [isAdmin | isVendeurOrAdmin]`
- Lectures : `authenticate + injectBoutique` suffisent
- Mutations (create/update) : ajouter `isVendeurOrAdmin`
- Suppressions : ajouter `isAdmin`
- Routes boutiques/users : `isAdmin` minimum
