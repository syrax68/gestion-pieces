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
      'arbracam', 'arbre a came', 'pompe essence'
    ]
  },
  {
    categorie: 'Transmission',
    keywords: [
      'courroie', 'courroi', 'chaine', 'variateur', 'marchelotte',
      'glisseur', 'rampe', 'magnette', 'pale', 'pal ',
      'bille', 'ressort de pouss', 'attaque', 'tendana'
    ]
  },
  {
    categorie: 'Freinage',
    keywords: [
      'plaquette', 'ferode', 'ferodo', 'cerveau', 'sarona',
      'cable frein'
    ]
  },
  {
    categorie: 'Électrique',
    keywords: [
      'bobine', 'cdi', 'regulateur', 'bougie', 'demareur', 'demarreur',
      'bendix', 'led', 'globe', 'cligno', 'detresse', 'claxon',
      'tableau', 'antenne'
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
    keywords: ['parahuille', 'para huille', 'joint']
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
      'retro', 'garde boue', 'cache', 'poignet', 'lacle',
      'verre', 'anneaux'
    ]
  },
  {
    categorie: 'Produits d\'entretien',
    keywords: ['colle', 'pate a rod', 'clean', 'nettoyant']
  },
  {
    categorie: 'Démarrage',
    keywords: ['kick']
  },
  {
    categorie: 'Visserie & Fixation',
    keywords: ['vis', 'attache', 'tolana']
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

// ============================================
// GENERATION DE REFERENCES
// ============================================
function genererReference(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// ============================================
// LECTURE EXCEL
// ============================================
interface PieceData {
  quantite: number;
  designation: string;
  prixUnitaire: number;
  fournisseur: string;
}

function lireFeuilleExcel(wb: XLSX.WorkBook, sheetName: string): PieceData[] {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 });
  const pieces: PieceData[] = [];

  // Skip header row (index 0) and TOTAL row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1] || row[0] === 'TOTAL' || row[1] === 'TOTAL') continue;

    const qte = typeof row[0] === 'number' ? row[0] : 0;
    const designation = String(row[1]).trim();
    const pu = typeof row[2] === 'number' ? row[2] : 0;

    if (designation && pu > 0) {
      pieces.push({
        quantite: qte,
        designation,
        prixUnitaire: pu,
        fournisseur: sheetName
      });
    }
  }

  return pieces;
}

// ============================================
// MAIN IMPORT
// ============================================
async function main() {
  console.log('=== Import Pièces Janvier ===\n');

  // 1. Lire le fichier Excel
  const excelPath = path.resolve(__dirname, '../../../Pieces Janvier.xlsx');
  const wb = XLSX.readFile(excelPath);

  const sheetsToImport = ['ALOALO', 'ADECAT', 'YYMP', 'FAN MOTO'];
  const prefixes: Record<string, string> = {
    'ALOALO': 'ALO',
    'ADECAT': 'ADC',
    'YYMP': 'YMP',
    'FAN MOTO': 'FMT'
  };

  let allPieces: PieceData[] = [];
  for (const sheet of sheetsToImport) {
    const pieces = lireFeuilleExcel(wb, sheet);
    allPieces = allPieces.concat(pieces);
    console.log(`  ${sheet}: ${pieces.length} pièces lues`);
  }
  console.log(`\nTotal: ${allPieces.length} pièces à importer\n`);

  // 2. Créer les 4 fournisseurs
  console.log('--- Création des fournisseurs ---');
  const fournisseurs: Record<string, any> = {};

  const fournisseurData = [
    { code: 'ALO001', nom: 'ALOALO' },
    { code: 'ADC001', nom: 'ADECAT' },
    { code: 'YMP001', nom: 'YYMP' },
    { code: 'FMT001', nom: 'FAN MOTO' }
  ];

  for (const f of fournisseurData) {
    const fournisseur = await prisma.fournisseur.upsert({
      where: { code: f.code },
      update: {},
      create: {
        code: f.code,
        nom: f.nom,
        pays: 'Madagascar',
        actif: true
      }
    });
    fournisseurs[f.nom] = fournisseur;
    console.log(`  Fournisseur créé: ${f.nom} (${f.code})`);
  }

  // 3. Créer les catégories manquantes
  console.log('\n--- Création des catégories ---');

  const categoriesNeeded = new Set<string>();
  for (const piece of allPieces) {
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

  // Load existing categories into map
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
      console.log(`  Catégorie créée: ${catName}`);
    } else {
      console.log(`  Catégorie existante: ${catName}`);
    }
  }

  // 4. Importer les pièces
  console.log('\n--- Import des pièces ---');

  const counters: Record<string, number> = {};
  for (const prefix of Object.values(prefixes)) {
    // Find highest existing reference for this prefix
    const existing = await prisma.piece.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true }
    });
    let maxNum = 0;
    for (const e of existing) {
      const num = parseInt(e.reference.split('-').pop() || '0');
      if (num > maxNum) maxNum = num;
    }
    counters[prefix] = maxNum;
  }

  let imported = 0;
  let skipped = 0;
  const categorieStats: Record<string, number> = {};

  for (const pieceData of allPieces) {
    const prefix = prefixes[pieceData.fournisseur];
    const categorieName = categoriserPiece(pieceData.designation);
    const categorie = categories[categorieName];
    const fournisseur = fournisseurs[pieceData.fournisseur];

    // Check if piece already exists (by nom + fournisseur combination)
    const existingPiece = await prisma.piece.findFirst({
      where: {
        nom: pieceData.designation,
        fournisseurId: fournisseur.id
      }
    });

    if (existingPiece) {
      console.log(`  SKIP (existe déjà): ${pieceData.designation}`);
      skipped++;
      continue;
    }

    counters[prefix]++;
    const reference = genererReference(prefix, counters[prefix]);

    // Prix de vente = prix d'achat * 1.3 (marge 30%)
    const prixAchat = pieceData.prixUnitaire;
    const prixVente = Math.round(prixAchat * 1.3);

    await prisma.piece.create({
      data: {
        reference,
        nom: pieceData.designation,
        prixVente,
        prixAchat,
        tauxTVA: 20,
        stock: pieceData.quantite,
        stockMin: 2,
        categorieId: categorie?.id || null,
        fournisseurId: fournisseur.id,
        actif: true
      }
    });

    imported++;
    categorieStats[categorieName] = (categorieStats[categorieName] || 0) + 1;

    if (imported % 20 === 0) {
      console.log(`  ... ${imported} pièces importées`);
    }
  }

  // 5. Résumé
  console.log(`\n========================================`);
  console.log(`Import terminé !`);
  console.log(`========================================`);
  console.log(`  Pièces importées: ${imported}`);
  console.log(`  Pièces ignorées (doublons): ${skipped}`);
  console.log(`\nRépartition par catégorie:`);

  const sortedStats = Object.entries(categorieStats).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedStats) {
    console.log(`  ${cat}: ${count} pièces`);
  }

  console.log(`\nFournisseurs:`);
  for (const sheet of sheetsToImport) {
    const count = allPieces.filter(p => p.fournisseur === sheet).length;
    console.log(`  ${sheet}: ${count} pièces`);
  }
}

main()
  .catch((e) => {
    console.error('Erreur pendant l\'import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
