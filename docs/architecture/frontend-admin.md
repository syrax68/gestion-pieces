# Architecture — Back-office admin (`packages/frontend`)

Interface d'administration React + Vite consommée par les admins, vendeurs et lecteurs. Communique exclusivement avec l'API privée `/api/*` (JWT).

## Stack

- **React 18** + **TypeScript**, **Vite**
- **Tailwind CSS** + **shadcn/ui** (composants dans `src/components/ui/`)
- **React Router** (`react-router-dom`)
- **Recharts** (graphiques dashboard)
- **dayjs** (formatage dates)
- **html2pdf.js** (génération PDF côté client)

## Structure

```
src/
├── App.tsx             # routes + gardes de route par rôle
├── main.tsx            # point d'entrée React
├── contexts/
│   └── AuthContext.tsx # état d'auth, user, boutique, rôles (isAdmin, canEdit, canDelete...)
├── lib/
│   ├── api.ts          # client API complet (types + endpoints)
│   ├── utils.ts        # formatCurrency, cn, etc.
│   └── storage.ts      # helpers localStorage
├── types/index.ts      # types partagés
├── hooks/              # hooks réutilisables
├── components/
│   ├── Layout.tsx      # header + navigation + nom de la boutique
│   ├── PieceForm.tsx, ReplacePieceDialog.tsx, ...
│   └── ui/             # primitives shadcn/ui
└── pages/              # une page par écran
```

## Gardes de route (`App.tsx`)

Le routage applique des composants de garde selon le rôle de l'utilisateur :

- `ProtectedRoute` — exige une session authentifiée
- `AdminRoute` — réservé aux admins
- `AdminOrSuperAdminRoute`
- `SuperAdminRoute` — gestion des boutiques, dashboard multi-boutiques
- `NonSuperAdminRoute` — écrans liés à une boutique unique (un super-admin est redirigé vers `/multi-boutiques`)

Les rôles viennent toujours de `useAuth()` (jamais de vérification hardcodée).

## Pages

`Dashboard`, `PiecesList`, `PieceDetails`, `StockManagement`, `Achats`, `Factures`, `Devis`, `Avoirs`, `Inventaires`, `Clients`, `Fournisseurs`, `Activity`, `Users`, `Boutiques`, `DashboardMultiBoutique`, `Login`.

## Conventions

- **Appels API** : uniquement via `@/lib/api.ts` (jamais de `fetch` direct). Endpoints regroupés par domaine (`authApi`, `piecesApi`, `facturesApi`, `dashboardApi`, `boutiquesApi`, etc.).
- **États** : toujours gérer `loading` (spinner `Loader2`), `error` (message rouge), données — pattern `try/catch/finally` avec `setLoading(false)` dans le `finally`.
- **Permissions UI** : conditionner les actions avec `{canEdit && ...}` / `{canDelete && ...}` issus de `AuthContext`.
- **Formulaires** : `Dialog` pour create/edit ; réinitialiser et fermer après succès ; afficher les erreurs API dans le formulaire.
- **Styling** : Tailwind uniquement, icônes `lucide-react` uniquement, pas de CSS custom.

Voir aussi `.claude/rules/frontend.md`.
