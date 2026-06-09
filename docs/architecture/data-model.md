# Architecture — Modèle de données (`packages/backend/prisma/schema.prisma`)

PostgreSQL via Prisma. 25 modèles, multi-tenant par `boutiqueId`. Référence rapide ci-dessous ; le schéma faisant foi reste `schema.prisma`.

## Tenant & utilisateurs

| Modèle | Rôle | Relations clés |
|---|---|---|
| `Boutique` | Tenant racine | → users, pieces, factures, clients, achats, etc. |
| `User` | Utilisateur | → boutique, factures créées, mouvements |
| `ActivityLog` | Journal d'audit | → user, boutique |

## Catalogue & stock

| Modèle | Rôle | Relations clés |
|---|---|---|
| `Piece` | Pièce détachée | → marque, categorie, sousCategorie, emplacement, images, fournisseurs |
| `Categorie` / `SousCategorie` | Classification | → pieces |
| `Marque` | Marque | → pieces |
| `Image` | Image de pièce (R2) | → piece |
| `Emplacement` | Emplacement physique de stock | → pieces |
| `MouvementStock` | Mouvement de stock | → piece, user, boutique |
| `Inventaire` / `InventaireItem` | Inventaire | → items → piece |
| `HistoriquePrix` | Historique des prix d'une pièce | → piece |

## Achats (fournisseurs)

| Modèle | Rôle | Relations clés |
|---|---|---|
| `Fournisseur` | Fournisseur | → pieces, achats |
| `PieceFournisseur` | Liaison pièce ↔ fournisseur | → piece, fournisseur |
| `Achat` / `AchatItem` | Achat fournisseur | → fournisseur, items → piece |

## Ventes (clients)

| Modèle | Rôle | Relations clés |
|---|---|---|
| `Client` | Client | → factures, devis, avoirs |
| `Devis` / `DevisItem` | Devis | → client, items → piece |
| `Facture` / `FactureItem` | Facture | → client, créateur, items → piece |
| `Avoir` / `AvoirItem` | Avoir / retour | → client, facture |
| `VenteJournaliere` | **Source de vérité du CA** (saisie manuelle) | → boutique |

> **Important** : le chiffre d'affaires se calcule à partir de `VenteJournaliere`, pas de `Facture`. Les `Facture` existent mais ne sont pas la source principale du CA — ne pas mélanger les deux dans les calculs.

## Enums

| Enum | Valeurs |
|---|---|
| `Role` | `SUPER_ADMIN`, `ADMIN`, `VENDEUR`, `LECTEUR` |
| `StatutFacture` | `BROUILLON`, `EN_ATTENTE`, `PAYEE`, `PARTIELLEMENT_PAYEE`, `ANNULEE` |
| `StatutDevis` | `BROUILLON`, `ENVOYE`, `ACCEPTE`, `REFUSE`, `EXPIRE` |
| `StatutAvoir` | `EN_ATTENTE`, `VALIDE`, `REMBOURSE` |
| `TypeMouvement` | `ENTREE`, `SORTIE`, `AJUSTEMENT`, `INVENTAIRE`, `RETOUR`, `TRANSFERT` |
| `StatutInventaire` | `EN_COURS`, `VALIDE`, `ANNULE` |

## Conventions de schéma

Tout nouveau modèle doit comporter :

- `id String @id @default(cuid())` — jamais d'UUID ni d'auto-increment
- `boutiqueId String` + relation `Boutique` + `@@index([boutiqueId])` — multi-tenant obligatoire
- `createdAt DateTime @default(now())` et `updatedAt DateTime @updatedAt`
- Montants en `Decimal(10, 2)` — **jamais** `Float` ; sérialisés via `serializePiece()` / `serializeFacture()` avant envoi HTTP

Nommage : modèles en PascalCase singulier, champs en camelCase, relations nommées d'après le modèle en camelCase.

## Environnements

- **Local** : `npx prisma migrate dev` (PostgreSQL Docker)
- **Production (Neon)** : `npx prisma migrate deploy` — jamais `migrate dev` en prod

Voir aussi `.claude/rules/database.md` pour les règles détaillées (migrations, requêtes, pagination).
