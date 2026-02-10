import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// ============================================
// CATEGORISATION DES PIECES PAR MOTS-CLES
// ============================================
interface CategorieMapping {
  categorie: string;
  keywords: string[];
}

const CATEGORIE_MAPPINGS: CategorieMapping[] = [
  {
    categorie: 'Moteur',
    keywords: [
      'chemise', 'segment', 'piston', 'soupape', 'vilbe', 'vilebrequin',
      'arbracam', 'arbre a came', 'pompe essence', 'gougeon', 'pipe', 'clapet'
    ]
  },
  {
    categorie: 'Transmission',
    keywords: [
      'courroie', 'courroi', 'chaine', 'variateur', 'marchelotte', 'marchellote',
      'glisseur', 'rampe', 'magnette', 'pale', 'pal ',
      'bille', 'ressort de pouss', 'attaque', 'tendana', 'flasque'
    ]
  },
  {
    categorie: 'Freinage',
    keywords: [
      'plaquette', 'ferode', 'ferodo', 'ferrodo', 'ferrodo', 'cerveau', 'sarona',
      'cable frein', 'disque', 'flexible'
    ]
  },
  {
    categorie: 'Électrique',
    keywords: [
      'bobine', 'cdi', 'regulateur', 'bougie', 'demareur', 'demarreur',
      'bendix', 'led', 'globe', 'cligno', 'detresse', 'claxon',
      'tableau', 'antenne', 'contacteur', 'boitier cligno', 'pulseur',
      'ampoule', 'tete bougie'
    ]
  },
  {
    categorie: 'Filtration',
    keywords: ['filtre']
  },
  {
    categorie: 'Huiles & Lubrifiants',
    keywords: [
      'huille', 'huile', 'graisse', 'degripant', 'louquide', 'liquide'
    ]
  },
  {
    categorie: 'Joints & Étanchéité',
    keywords: ['parahuille', 'para huille', 'joint', 'join ']
  },
  {
    categorie: 'Roulements',
    keywords: ['roulement']
  },
  {
    categorie: 'Suspension',
    keywords: ['amort', 'fourche']
  },
  {
    categorie: 'Câblerie',
    keywords: ['cable']
  },
  {
    categorie: 'Carrosserie & Accessoires',
    keywords: [
      'retro', 'ralonge retro', 'garde boue', 'cache', 'poignet', 'lacle',
      'verre', 'anneaux', 'casque', 'barnadeur'
    ]
  },
  {
    categorie: 'Produits d\'entretien',
    keywords: ['colle', 'pate a rod', 'clean', 'nettoyant', 'depoxi']
  },
  {
    categorie: 'Démarrage',
    keywords: ['kick']
  },
  {
    categorie: 'Visserie & Fixation',
    keywords: ['vis', 'attache', 'tolana', 'boulon']
  }
];

function categoriserPiece(designation: string): string {
  const nom = designation.toLowerCase().trim();

  for (const mapping of CATEGORIE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (nom.includes(keyword.toLowerCase())) {
        return mapping.categorie;
      }
    }
  }

  return 'Divers';
}

function genererReference(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// ============================================
// MAIN IMPORT
// ============================================
async function main() {
  console.log('=== Import Pièces JACKS ===\n');

  // 1. Lire le fichier Excel
  const excelPath = path.resolve(__dirname, '../../../Pieces Janvier.xlsx');
  const wb = XLSX.readFile(excelPath);

  // 2. Lire les prix de vente depuis "Pieces Total"
  const wsTotal = wb.Sheets['Pieces Total'];
  const totalData = XLSX.utils.sheet_to_json<(string | number | null)[]>(wsTotal, { header: 1 });
  const prixVenteMap: Record<string, number> = {};

  for (let i = 1; i < totalData.length; i++) {
    const row = totalData[i];
    if (!row || !row[0]) continue;
    const designation = String(row[0]).trim();
    const prixVente = typeof row[2] === 'number' ? row[2] : 0;
    if (designation && prixVente > 0) {
      prixVenteMap[designation] = prixVente;
    }
  }

  // 3. Lire la feuille JACKS
  const wsJacks = wb.Sheets['JACKS'];
  const jacksData = XLSX.utils.sheet_to_json<(string | number | null)[]>(wsJacks, { header: 1 });

  interface JacksPiece {
    quantite: number;
    designation: string;
    prixAchat: number;
    prixVente: number;
  }

  const pieces: JacksPiece[] = [];
  for (let i = 1; i < jacksData.length; i++) {
    const row = jacksData[i];
    if (!row || !row[1] || row[1] === 'Total') continue;

    const qte = typeof row[0] === 'number' ? row[0] : 0;
    const designation = String(row[1]).trim();
    const prixAchat = typeof row[2] === 'number' ? row[2] : 0;
    const prixVente = prixVenteMap[designation] || 0;

    if (designation && prixAchat > 0) {
      pieces.push({ quantite: qte, designation, prixAchat, prixVente });
    }
  }

  console.log(`Pièces JACKS lues: ${pieces.length}`);
  console.log(`Avec prix de vente: ${pieces.filter(p => p.prixVente > 0).length}\n`);

  // 4. Créer le fournisseur JACKS
  console.log('--- Fournisseur ---');
  const fournisseur = await prisma.fournisseur.upsert({
    where: { code: 'JCK001' },
    update: {},
    create: {
      code: 'JCK001',
      nom: 'JACKS',
      pays: 'Madagascar',
      actif: true
    }
  });
  console.log(`  Fournisseur: JACKS (${fournisseur.id})\n`);

  // 5. Créer les catégories manquantes
  console.log('--- Catégories ---');
  const categoriesNeeded = new Set<string>();
  for (const piece of pieces) {
    categoriesNeeded.add(categoriserPiece(piece.designation));
  }

  const existingCategories = await prisma.categorie.findMany();
  const existingNames = new Set(existingCategories.map(c => c.nom));

  const categorieIcones: Record<string, string> = {
    'Huiles & Lubrifiants': 'droplets',
    'Joints & Étanchéité': 'circle-dot',
    'Roulements': 'rotate-cw',
    'Suspension': 'arrow-up-down',
    'Câblerie': 'cable',
    'Carrosserie & Accessoires': 'car',
    'Produits d\'entretien': 'spray-can',
    'Démarrage': 'play',
    'Visserie & Fixation': 'wrench',
    'Divers': 'package'
  };

  let ordreCounter = existingCategories.length + 1;
  const categories: Record<string, any> = {};

  for (const cat of existingCategories) {
    categories[cat.nom] = cat;
  }

  for (const catName of categoriesNeeded) {
    if (!existingNames.has(catName)) {
      const cat = await prisma.categorie.create({
        data: {
          nom: catName,
          description: catName,
          icone: categorieIcones[catName] || 'package',
          ordre: ordreCounter++,
          actif: true
        }
      });
      categories[catName] = cat;
      console.log(`  Créée: ${catName}`);
    } else {
      console.log(`  Existante: ${catName}`);
    }
  }

  // 6. Importer les pièces
  console.log('\n--- Import des pièces ---');

  const prefix = 'JCK';
  // Trouver le plus haut numéro de référence existant
  const existingRefs = await prisma.piece.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true }
  });
  let counter = 0;
  for (const e of existingRefs) {
    const num = parseInt(e.reference.split('-').pop() || '0');
    if (num > counter) counter = num;
  }

  let imported = 0;
  let skipped = 0;
  const categorieStats: Record<string, number> = {};

  for (const piece of pieces) {
    const categorieName = categoriserPiece(piece.designation);
    const categorie = categories[categorieName];

    // Vérifier si la pièce existe déjà
    const existing = await prisma.piece.findFirst({
      where: {
        nom: piece.designation,
        fournisseurId: fournisseur.id
      }
    });

    if (existing) {
      console.log(`  SKIP (existe): ${piece.designation}`);
      skipped++;
      continue;
    }

    counter++;
    const reference = genererReference(prefix, counter);

    await prisma.piece.create({
      data: {
        reference,
        nom: piece.designation,
        prixVente: piece.prixVente > 0 ? piece.prixVente : Math.round(piece.prixAchat * 1.3),
        prixAchat: piece.prixAchat,
        tauxTVA: 0,
        stock: piece.quantite,
        stockMin: 2,
        categorieId: categorie?.id || null,
        fournisseurId: fournisseur.id,
        actif: true
      }
    });

    imported++;
    categorieStats[categorieName] = (categorieStats[categorieName] || 0) + 1;
    console.log(`  ✓ ${reference} | ${piece.designation} | achat: ${piece.prixAchat} | vente: ${piece.prixVente > 0 ? piece.prixVente : Math.round(piece.prixAchat * 1.3)}`);
  }

  // 7. Résumé
  console.log(`\n========================================`);
  console.log(`Import JACKS terminé !`);
  console.log(`========================================`);
  console.log(`  Pièces importées: ${imported}`);
  console.log(`  Pièces ignorées (doublons): ${skipped}`);
  console.log(`\nRépartition par catégorie:`);

  const sortedStats = Object.entries(categorieStats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedStats) {
    console.log(`  ${cat}: ${count} pièces`);
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
