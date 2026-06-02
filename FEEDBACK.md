# FEEDBACK — Analyse du projet Gestion Pièces Moto

> Analyse effectuée le 2026-06-02. Fichiers couverts : backend routes, middleware, schema Prisma, frontend Dashboard, api.ts, contexts.
> Mis à jour le 2026-06-02 : adoption dayjs, clarification no-TVA.

---

## 🔴 BUG CRITIQUE — Graphique "Ventes & Achats mensuels" : ventes = 0

### Symptôme
Les KPI en haut affichent 7 280 000 Ar de ventes (période déc. 2025 → juin 2026), mais le graphique mensuel montre des barres ventes = 0 sur tous les mois. Les barres achats s'affichent correctement (~2,8M en mai).

### Diagnostic

Il existe **deux sources de données différentes** selon l'endpoint :

| Endpoint | Source ventes |
|----------|--------------|
| `/dashboard/kpi` | `VentesJournaliere` uniquement |
| `/dashboard/sales-chart` | `Facture` (PAYEE/EN_ATTENTE/PARTIELLEMENT_PAYEE) **+** `VentesJournaliere` |

Le KPI fonctionne car il interroge uniquement `VentesJournaliere` avec un filtre de dates venant du frontend (chaîne ISO `"2025-12-31"` → `new Date(str)` → `.setHours(0,0,0,0)`).

Le `sales-chart` construit ses plages mensuelles avec `new Date(year, month, day)` (heure locale du serveur). La différence de construction peut provoquer un décalage selon le fuseau horaire du serveur déployé (Hostinger).

**Cause la plus probable** : les `VentesJournaliere.date` sont stockées en UTC midnight (`new Date("2026-05-30")` = `2026-05-30T00:00:00.000Z`) alors que les bornes mensuelles du `sales-chart` utilisent l'heure locale du processus Node.js. Si le serveur est en UTC ou UTC+3, les dates devraient correspondre — mais si un décalage se produit, toutes les entrées tombent hors des plages mensuelles.

**Cause secondaire confirmée** : si toutes les `Facture` sont en statut `BROUILLON`, la contribution factures = 0. Si en plus les `VentesJournaliere` ne matchent pas, `ventes` = 0 sur tous les mois.

### Vérification rapide
Ajouter un `console.log` dans le handler `sales-chart` pour chaque mois :
```ts
console.log(`[${mois}] start=${start.toISOString()} end=${end.toISOString()} ventesJour=${ventesJour.length}`);
```
Cela confirmera si les entrées sont trouvées ou non.

### Correctif appliqué ✅
Migré vers **dayjs** (`dayjs.utc()`) dans `dashboard.ts` et `Dashboard.tsx`. La boucle de 36 requêtes a été remplacée par 2 requêtes globales avec regroupement côté Node.js. Source ventes unifiée sur `VentesJournaliere` (cohérent avec `/kpi` et `/stats`).

```ts
// Avant — timezone locale implicite, 36 requêtes
for (let i = 11; i >= 0; i--) {
  const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
  ...
}

// Après — UTC explicite, 2 requêtes globales
const [allVentes, allAchats] = await Promise.all([...]);  // 1 requête chacun
const monthKey = dayjs.utc().subtract(i, "month").format("YYYY-MM");
```

---

## 🟠 PROBLÈMES D'ARCHITECTURE

### 1. Double comptage potentiel ventes (incohérence métier)

Le système possède **deux façons** de comptabiliser les ventes :
- `VentesJournaliere` : saisie manuelle d'un montant journalier
- `Facture` : factures avec items, statuts, workflow

Le `/sales-chart` additionne les deux. Le `/kpi` n'utilise que `VentesJournaliere`. Le `/stats` (carte "Ventes du mois") n'utilise que `VentesJournaliere`. Cette incohérence rend les totaux difficiles à comprendre et pourra entraîner des doubles comptages si des factures sont utilisées en plus des ventes journalières.

**Recommandation** : choisir une seule source de vérité. Si la boutique utilise principalement `VentesJournaliere`, retirer `factures` du calcul dans `sales-chart`.

---

### 2. `authenticate` fait une requête BDD à chaque appel

```ts
// middleware/auth.ts ligne 35
const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
```

Cette vérification en DB sur **chaque requête** authentifiée est coûteuse. Avec Neon (serverless), chaque connexion est payante en latence.

**Recommandation** : stocker `actif`, `boutiqueId`, `role` dans le JWT au login et les vérifier depuis le token. Ne faire un `findUnique` que si le rôle/boutique peut changer en cours de session (ou sur `/me`).

---

### 3. `injectBoutique` auto-assigne une boutique en middleware

```ts
// middleware/tenant.ts ligne 29–44
const defaultBoutique = await prisma.boutique.findFirst(...);
await prisma.user.update({ where: ..., data: { boutiqueId: defaultBoutique.id } });
```

Un middleware qui modifie des données est une mauvaise pratique : un GET anodin peut créer une mutation inattendue. Cette logique devrait être dans le flow d'inscription/connexion, pas dans chaque requête.

---

### 4. `boutiqueId` nullable dans les modèles critiques

```prisma
// schema.prisma
boutiqueId    String?   // nullable sur Piece, Facture, Achat, etc.
```

Les règles métier imposent de toujours filtrer par `boutiqueId`, mais le schéma permet `null`. Des enregistrements sans boutique pourraient fuiter à travers les filtres Prisma (Prisma ignore les `undefined` dans les `where`). 

**Recommandation** : passer `boutiqueId String` (non nullable) sur tous les modèles opérationnels, avec migration.

---

### 5. `Piece.reference` unique global, pas par boutique

```prisma
reference String @unique
```

Deux boutiques ne peuvent pas avoir la même référence article. En multi-tenant, ce devrait être :

```prisma
reference String
@@unique([boutiqueId, reference])
```

---

### 6. `isAdmin` exclut `SUPER_ADMIN`

```ts
export const isAdmin = requireRole(Role.ADMIN); // SUPER_ADMIN bloqué
```

`isAdminOrSuperAdmin` existe mais n'est pas utilisé dans les routes opérationnelles (bloquées par `requireNonSuperAdmin`). La conséquence est que le SUPER_ADMIN ne peut jamais accéder aux suppressions de données opérationnelles. Vérifier si c'est intentionnel.

---

### 7. `TokenExpiredError` jamais attrapé

```ts
// middleware/auth.ts
if (error instanceof jwt.JsonWebTokenError) {  // ← TokenExpiredError extends JsonWebTokenError
  return res.status(401).json({ error: "Token invalide" });
}
if (error instanceof jwt.TokenExpiredError) {  // ← jamais atteint
  return res.status(401).json({ error: "Token expiré" });
}
```

Inverser l'ordre des `instanceof` pour que `TokenExpiredError` soit testé en premier.

---

## 🟡 PROBLÈMES DE PERFORMANCE

### 8. Absence de pagination sur les listes

`GET /factures`, `GET /pieces`, `GET /clients`, etc. n'ont pas de `take`/`skip`. Sur un gros catalogue, ces routes ramèneront l'intégralité des données.

**Recommandation** : ajouter `?page=` et `?limit=` avec un défaut `take: 50` pour toutes les listes.

---

### 9. `sales-chart` : 12 requêtes DB séquentielles en boucle

```ts
for (let i = 11; i >= 0; i--) {
  const [factures, ventesJour, achats] = await Promise.all([...]); // 3 requêtes/mois
}
```

= 36 requêtes DB (12 × 3). Avec Neon serverless, la latence s'accumule.

**Recommandation** : récupérer toutes les données sur 12 mois en 3 requêtes globales, puis agréger côté Node.js :

```ts
const allFactures = await prisma.facture.findMany({ where: { dateFacture: { gte: startOf12Months }, ... }});
// puis grouper par mois en JS
```

---

### 10. `low-stock` charge toutes les pièces en mémoire

```ts
const pieces = await prisma.piece.findMany({ where: { actif: true, boutiqueId }, include: ... });
const lowStock = pieces.filter(p => p.stock <= p.stockMin);
```

Filtrer côté DB est bien plus efficace :

```ts
const lowStock = await prisma.piece.findMany({
  where: { actif: true, boutiqueId, stock: { lte: prisma.piece.fields.stockMin } }
});
```
*(Prisma ne supporte pas les comparaisons inter-colonnes nativement — utiliser une raw query ou un `$queryRaw` pour ce cas.)*

---

## 🔵 QUALITÉ DU CODE

### 11. Graphique : Bar + Line sur le même `dataKey="ventes"`

```jsx
<Bar  dataKey="ventes" fill="#3b82f6" name="ventes" />
<Bar  dataKey="achats" fill="#fb923c" name="achats" />
<Line dataKey="ventes" stroke="#1d4ed8" name="tendance ventes" />
```

En Recharts `ComposedChart`, un `Bar` et une `Line` sur le même `dataKey` sont valides mais peuvent générer une confusion visuelle et une légende dupliquée. Si l'intention est de montrer une tendance (Line) par-dessus les barres, c'est acceptable, mais clarifier avec un `dataKey` différent pour la ligne (ex: `"ventes_trend"` en calculant une moyenne glissante).

---

### 12. ~~`factureItemSchema` : champ `tva` manquant~~ — NON APPLICABLE

**Le site n'utilise pas de TVA.** Les champs `tva` présents dans le schéma Prisma et les modèles sont des reliquats de la conception initiale. Il n'y a pas de calcul de TVA dans l'application (les factures affichent `tva: 0`). Aucune action requise.

> **À documenter dans CLAUDE.md** : préciser explicitement que le site est hors TVA afin d'éviter d'ajouter des calculs TVA par erreur dans le futur.

---

### 13. Pas de `logActivity` sur les PUT dans certaines routes

La route `PUT /ventes-journalieres/:id` (modifier une vente) ne logue pas l'activité, alors que le POST oui. Vérifier la cohérence dans toutes les routes.

---

## ✅ POINTS POSITIFS

- Architecture multi-tenant bien pensée avec `injectBoutique` + `ensureBoutique()`
- Validation Zod systématique sur les inputs
- `handleRouteError` centralisé et cohérent
- `adjustStock()` centralisé dans `stockService.ts`
- `generateNumero()` centralisé
- `serializePiece/Facture/Achat` pour gérer les Decimal Prisma
- Séparation claire des responsabilités (routes, services, utils)
- `requireNonSuperAdmin` pour protéger les routes opérationnelles
- Transactions Prisma utilisées sur les opérations multi-étapes

---

## PLAN D'ACTION PRIORITAIRE

| Priorité | Action | Statut |
|----------|--------|--------|
| 🔴 P0 | Bug `sales-chart` ventes = 0 — dayjs UTC + 2 requêtes globales | ✅ Corrigé |
| 🔴 P0 | Aligner sources ventes `/kpi`, `/stats`, `/sales-chart` → `VentesJournaliere` | ✅ Corrigé |
| 🔴 P0 | Adopter dayjs backend + frontend | ✅ Corrigé |
| 🟠 P1 | Passer `boutiqueId` en non-nullable dans le schéma | ⏳ À faire |
| 🟠 P1 | Corriger `Piece.reference` → `@@unique([boutiqueId, reference])` | ⏳ À faire |
| 🟠 P1 | Corriger l'ordre `TokenExpiredError` dans `auth.ts` | ⏳ À faire |
| 🟡 P2 | Ajouter pagination sur les listes | ⏳ À faire |
| 🟡 P2 | Sortir l'auto-assign boutique du middleware | ⏳ À faire |
| 🔵 P3 | Compléter `logActivity` sur les PUT manquants | ⏳ À faire |
| ~~🔵 P3~~ | ~~Ajouter `tva` dans `factureItemSchema`~~ | ✅ Non applicable (no TVA) |
