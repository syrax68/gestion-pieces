Vérifie les erreurs TypeScript dans les deux packages du monorepo.

## Commandes à exécuter

```bash
cd packages/backend && npx tsc --noEmit
```

```bash
cd packages/frontend && npx tsc --noEmit
```

## Analyse des erreurs
- Pour chaque erreur, lire le fichier concerné et corriger le problème
- Ne pas utiliser `@ts-ignore` sauf cas exceptionnel justifié
- Les types de l'API backend et frontend doivent rester synchronisés
- Les `Decimal` Prisma doivent être sérialisés via `serializePiece()` / `serializeFacture()` avant d'être renvoyés au frontend (sinon erreur de type sur `number` vs `Decimal`)

Corrige toutes les erreurs trouvées.
