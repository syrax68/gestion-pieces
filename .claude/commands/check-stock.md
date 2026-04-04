Vérifie la cohérence du stock en base de données.

Analyse les éventuelles incohérences de stock dans le projet.

## Vérifications à effectuer

### 1. Pièces avec stock négatif
```bash
cd packages/backend && npx prisma db execute --stdin <<EOF
SELECT id, reference, nom, stock FROM "Piece" WHERE stock < 0 AND "boutiqueId" IS NOT NULL;
EOF
```

### 2. Mouvements sans pièce associée valide
Lire `packages/backend/src/services/stockService.ts` pour comprendre `adjustStock()` et vérifier que chaque type de mouvement est bien géré.

### 3. Factures PAYEE sans mouvement SORTIE
Chercher dans le code la logique de déclenchement des mouvements stock dans `packages/backend/src/routes/factures.ts`.

### 4. Achats sans mouvement ENTREE
Chercher dans `packages/backend/src/routes/achats.ts`.

## Rapport
Produis un rapport des incohérences trouvées avec :
- Nombre de pièces concernées
- Exemple de cas problématique
- Recommandation de correction

Si des corrections sont nécessaires, proposer un script de correction avant de l'appliquer.
