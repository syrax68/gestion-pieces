# Gestion Pièces Moto

Application de gestion de stock de pièces détachées pour motos construite avec React, TypeScript, Tailwind CSS et shadcn/ui.

## 🚀 Démarrage rapide

### Installation des dépendances

```bash
npm install
```

### Lancement en mode développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build pour la production

```bash
npm run build
```

### Aperçu du build de production

```bash
npm run preview
```

## 📦 Technologies utilisées

- **React 18** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et dev server
- **Tailwind CSS** - Framework CSS utilitaire
- **shadcn/ui** - Composants UI
- **React Router** - Navigation
- **Lucide React** - Icônes

## 🏗️ Structure du projet

```
src/
├── components/
│   ├── ui/              # Composants shadcn/ui
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   └── Layout.tsx       # Layout principal
├── pages/
│   ├── Dashboard.tsx    # Tableau de bord
│   ├── PiecesList.tsx   # Liste des pièces
│   └── PieceDetails.tsx # Détails d'une pièce
├── types/
│   └── index.ts         # Types TypeScript
├── lib/
│   └── utils.ts         # Utilitaires
├── App.tsx              # Composant racine
├── main.tsx            # Point d'entrée
└── index.css           # Styles globaux
```

## 🎨 Fonctionnalités actuelles

- ✅ Tableau de bord avec statistiques
- ✅ Liste des pièces avec recherche
- ✅ Détails d'une pièce
- ✅ Navigation entre les pages
- ✅ Design responsive
- ✅ Mode clair/sombre (via Tailwind)

## 🔜 Prochaines étapes

- [ ] Formulaires d'ajout/modification de pièces
- [ ] Gestion des catégories et marques
- [ ] Gestion des fournisseurs
- [ ] Historique des mouvements de stock
- [ ] Exports (PDF, Excel)
- [ ] Authentification
- [ ] Backend API
- [ ] Base de données

## 📝 Licence

MIT
