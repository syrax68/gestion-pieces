Réinitialise et repeuple la base de données locale avec les données initiales.

## Étapes

1. S'assurer que Docker tourne :
```bash
docker compose up -d
```

2. Appliquer toutes les migrations en attente :
```bash
cd packages/backend && npx prisma migrate deploy
```

3. Exécuter le seed :
```bash
cd packages/backend && npx prisma db seed
```

## Ce que le seed crée (packages/backend/prisma/seed.ts)
- Une boutique par défaut
- Utilisateurs : admin, vendeur, lecteur
- Catégories et sous-catégories de pièces moto
- Marques véhicules
- Quelques pièces et fournisseurs de démonstration

## Credentials après seed
- Admin : `admin@moto.fr` / `admin123`
- Vendeur : `vendeur@moto.fr` / `vendeur123`
- Lecteur : `lecteur@moto.fr` / `lecteur123`
