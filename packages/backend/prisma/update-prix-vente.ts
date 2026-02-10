import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface ExcelPiece {
  designation: string;
  prix: number;
  prixVente: number;
}

async function main() {
  console.log('=== Mise à jour des Prix de Vente depuis Pieces Total ===\n');

  // 1. Lire le fichier Excel - feuille "Pieces Total"
  const excelPath = path.resolve(__dirname, '../../../Pieces Janvier.xlsx');
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets['Pieces Total'];
  const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1 });

  const excelPieces: ExcelPiece[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const designation = String(row[0]).trim();
    const prix = typeof row[1] === 'number' ? row[1] : 0;
    const prixVente = typeof row[2] === 'number' ? row[2] : 0;

    if (designation && prixVente > 0) {
      excelPieces.push({ designation, prix, prixVente });
    }
  }

  console.log(`Pièces lues depuis Excel: ${excelPieces.length}\n`);

  // 2. Récupérer toutes les pièces de la base
  const dbPieces = await prisma.piece.findMany({
    select: {
      id: true,
      nom: true,
      prixVente: true,
      prixAchat: true,
    }
  });

  console.log(`Pièces en base: ${dbPieces.length}\n`);

  // 3. Indexer les pièces DB par nom
  const dbByName: Record<string, typeof dbPieces> = {};
  for (const p of dbPieces) {
    const key = p.nom.trim();
    if (!dbByName[key]) dbByName[key] = [];
    dbByName[key].push(p);
  }

  // 4. Mettre à jour les prix
  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  let unchanged = 0;
  const notFoundList: string[] = [];

  for (const excel of excelPieces) {
    const matches = dbByName[excel.designation];

    if (!matches || matches.length === 0) {
      notFound++;
      notFoundList.push(excel.designation);
      continue;
    }

    if (matches.length === 1) {
      // Cas simple: une seule pièce avec ce nom
      const dbPiece = matches[0];
      const currentPrix = Number(dbPiece.prixVente);

      if (currentPrix === excel.prixVente) {
        unchanged++;
        continue;
      }

      await prisma.piece.update({
        where: { id: dbPiece.id },
        data: { prixVente: excel.prixVente }
      });
      updated++;
      console.log(`  ✓ ${excel.designation}: ${currentPrix} → ${excel.prixVente}`);
    } else {
      // Cas doublon: matcher par prixAchat
      const prixAchat = excel.prix;
      const match = matches.find(m => Number(m.prixAchat) === prixAchat);

      if (match) {
        const currentPrix = Number(match.prixVente);

        if (currentPrix === excel.prixVente) {
          unchanged++;
          continue;
        }

        await prisma.piece.update({
          where: { id: match.id },
          data: { prixVente: excel.prixVente }
        });
        updated++;
        console.log(`  ✓ ${excel.designation} (prixAchat=${prixAchat}): ${currentPrix} → ${excel.prixVente}`);
      } else {
        // Pas de match par prixAchat, prendre le premier non mis à jour
        const dbPiece = matches[0];
        const currentPrix = Number(dbPiece.prixVente);

        if (currentPrix === excel.prixVente) {
          unchanged++;
          continue;
        }

        await prisma.piece.update({
          where: { id: dbPiece.id },
          data: { prixVente: excel.prixVente }
        });
        updated++;
        console.log(`  ✓ ${excel.designation} (premier match): ${currentPrix} → ${excel.prixVente}`);
      }
    }
  }

  // 5. Résumé
  console.log(`\n========================================`);
  console.log(`Mise à jour terminée !`);
  console.log(`========================================`);
  console.log(`  Prix mis à jour:    ${updated}`);
  console.log(`  Prix inchangés:     ${unchanged}`);
  console.log(`  Non trouvés en DB:  ${notFound}`);

  if (notFoundList.length > 0) {
    console.log(`\nPièces non trouvées en base:`);
    for (const name of notFoundList) {
      console.log(`  - ${name}`);
    }
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
