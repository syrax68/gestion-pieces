Ajoute un nouveau modèle Prisma pour : $ARGUMENTS

## Étapes complètes

### 1. Modifier le schéma Prisma
Fichier : `packages/backend/prisma/schema.prisma`

Structure type pour un modèle multi-tenant :
```prisma
model $ARGUMENTS {
  id         String   @id @default(cuid())
  // ... champs métier
  boutique   Boutique @relation(fields: [boutiqueId], references: [id])
  boutiqueId String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([boutiqueId])
}
```

Ne pas oublier d'ajouter la relation inverse dans `Boutique` :
```prisma
// Dans model Boutique
nomPluriels $ARGUMENTS[]
```

### 2. Créer la migration
```bash
cd packages/backend && npx prisma migrate dev --name add-$ARGUMENTS
```

### 3. Créer la route backend
Utiliser le skill `/new-route $ARGUMENTS` comme point de départ.

### 4. Ajouter les types frontend
Dans `packages/frontend/src/lib/api.ts` :
- Interface TypeScript du modèle
- Fonctions d'API (getAll, getById, create, update, delete)

### 5. Créer la page frontend (si nécessaire)
Utiliser le skill `/new-page $ARGUMENTS` comme point de départ.

## Checklist
- [ ] Champ `boutiqueId` présent + index
- [ ] Relation inverse dans `Boutique`
- [ ] Migration créée et appliquée
- [ ] Route backend avec auth + tenant + Zod
- [ ] Types frontend synchronisés
- [ ] `logActivity()` dans les mutations
- [ ] `ensureBoutique()` dans les lectures par ID
