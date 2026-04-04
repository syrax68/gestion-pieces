Crée une nouvelle page React dans `packages/frontend/src/pages/$ARGUMENTS.tsx` en suivant les conventions du projet.

## Structure de base

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { someApi } from "@/lib/api";

export default function $ARGUMENTS() {
  const { isAdmin, canEdit, canDelete } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await someApi.getAll();
      setItems(data);
    } catch {
      setError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Titre</h1>
        {canEdit && <Button onClick={() => {}}><Plus className="h-4 w-4 mr-2" />Ajouter</Button>}
      </div>
      {/* contenu */}
    </div>
  );
}
```

## Règles impératives
- Utiliser `useAuth()` pour récupérer `isAdmin`, `canEdit`, `canDelete`
- Conditionner les boutons d'action avec `canEdit` et `canDelete`
- Loading state avec `<Loader2 className="animate-spin" />`
- Error state explicite en rouge
- Toujours `try/catch/finally` avec `setLoading(false)` dans `finally`
- Tailwind + composants shadcn/ui de `@/components/ui/`
- Pas de `any` TypeScript — utiliser les types de `@/lib/api` ou `@/types`

## Après la création du fichier
1. Ajouter la route dans `packages/frontend/src/App.tsx`
2. Ajouter le lien de navigation dans `packages/frontend/src/components/Layout.tsx` si nécessaire
