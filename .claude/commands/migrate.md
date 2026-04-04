Applique une migration Prisma avec le nom fourni en argument.

Le nom de la migration est : $ARGUMENTS

## Étapes à suivre

1. Vérifier que Docker est lancé (base locale) :
```bash
docker compose up -d
```

2. Créer et appliquer la migration :
```bash
cd packages/backend && npx prisma migrate dev --name $ARGUMENTS
```

3. Régénérer le client Prisma si nécessaire :
```bash
cd packages/backend && npx prisma generate
```

4. Si la migration est pour **Neon** (production), utiliser à la place :
```bash
cd packages/backend && npx prisma migrate deploy
```

## Après la migration
- Vérifier le fichier généré dans `packages/backend/prisma/migrations/`
- Si le schéma a changé, vérifier que les routes backend concernées sont mises à jour
- Mettre à jour les types frontend dans `packages/frontend/src/lib/api.ts` si de nouveaux champs sont exposés
