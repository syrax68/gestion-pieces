# Règles Frontend

## Auth et permissions
- Toujours utiliser `useAuth()` pour accéder aux rôles : `isAdmin`, `canEdit`, `canDelete`
- Conditionner l'affichage des boutons d'action : `{canEdit && <Button>...}`
- Ne jamais hardcoder des vérifications de rôle — tout passe par `AuthContext`

## États de chargement
- Toujours gérer 3 états : `loading` (Loader2 spinner), `error` (message rouge), données chargées
- Pattern `try/catch/finally` avec `setLoading(false)` dans le `finally`
- Ne jamais laisser une page sans état de chargement visible

## Composants UI
- Utiliser exclusivement les composants shadcn/ui de `@/components/ui/`
- Icônes : lucide-react uniquement
- Pas de classes CSS custom — Tailwind uniquement
- Espacements : `space-y-6` pour les sections, `gap-4` pour les grilles

## Appels API
- Toutes les fonctions API sont dans `@/lib/api.ts` — ne jamais appeler `fetch` directement
- Les types TypeScript des entités viennent de `@/lib/api.ts` ou `@/types/index.ts`
- Pas de `any` — typer correctement avec les interfaces définies

## Formulaires
- Dialog pour les formulaires create/edit (pattern utilisé dans toutes les pages)
- Réinitialiser le formulaire après succès : `setForm(initialState)`
- Fermer le dialog après succès : `setIsFormOpen(false)`
- Afficher les erreurs d'API dans le formulaire, pas juste en console

## Performance
- `useEffect` avec tableau de dépendances correct — ne pas laisser vide sauf au mount
- Pas de refetch inutile — recharger les données après mutation avec `load()`
- Utiliser `searchTerm` avec filtre côté client pour les listes courtes, côté API pour les grandes listes
