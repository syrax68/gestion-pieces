Crée une nouvelle route API Express dans `packages/backend/src/routes/$ARGUMENTS.ts` en suivant exactement les conventions du projet.

## Structure obligatoire

```typescript
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../index.js";
import { authenticate, isVendeurOrAdmin, isAdmin, AuthRequest } from "../middleware/auth.js";
import { injectBoutique } from "../middleware/tenant.js";
import { handleRouteError } from "../utils/handleError.js";
import { ensureBoutique } from "../utils/ensureBoutique.js";
import { logActivity } from "../lib/activityLog.js";

const router = Router();
router.use(authenticate, injectBoutique);

// Schéma Zod de validation
const schema = z.object({ ... });

// GET / — liste
// GET /:id — détail
// POST / — création (isVendeurOrAdmin)
// PUT /:id — mise à jour (isVendeurOrAdmin)
// DELETE /:id — suppression (isAdmin)

export default router;
```

## Règles impératives
- Toujours filtrer par `(req as AuthRequest).boutiqueId` dans chaque requête Prisma
- Utiliser `ensureBoutique()` sur chaque `findUnique` pour vérifier l'appartenance
- Wrap chaque handler dans `try/catch` → `handleRouteError(res, error, "description")`
- `logActivity()` après chaque mutation (POST, PUT, DELETE)
- Validation Zod avec `.parse()` ou `.safeParse()` sur `req.body`
- Protéger les mutations avec `isVendeurOrAdmin`, suppressions avec `isAdmin`

## Après la création du fichier
1. Importer et monter la route dans `packages/backend/src/index.ts` : `app.use("/api/$ARGUMENTS", ...)`
2. Ajouter les fonctions d'API dans `packages/frontend/src/lib/api.ts`
3. Ajouter les types TypeScript dans `packages/frontend/src/types/index.ts` si nécessaire
