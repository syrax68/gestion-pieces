import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enregistrerVente() {
  console.log('=== Enregistrement de la première vente ===\n');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Admin user not found');

  const catJoints = await prisma.categorie.findFirst({ where: { nom: 'Joints & Étanchéité' } });
  const catTransmission = await prisma.categorie.findFirst({ where: { nom: 'Transmission' } });
  const fournYYMP = await prisma.fournisseur.findFirst({ where: { nom: 'YYMP' } });
  const fournADECAT = await prisma.fournisseur.findFirst({ where: { nom: 'ADECAT' } });

  // Créer les 2 pièces manquantes
  console.log('--- Création des pièces manquantes ---');

  const jointSml = await prisma.piece.create({
    data: {
      reference: 'ADC-065',
      nom: 'Joint 5ML',
      prixAchat: 5000,
      prixVente: 6500,
      tauxTVA: 0,
      stock: 0,
      stockMin: 2,
      categorieId: catJoints?.id || undefined,
      fournisseurId: fournADECAT?.id || undefined,
      actif: true
    }
  });
  console.log('  Créé: Joint 5ML (' + jointSml.reference + ')');

  const glisseurSml = await prisma.piece.create({
    data: {
      reference: 'YMP-081',
      nom: 'Glisseur 5ML',
      prixAchat: 50000,
      prixVente: 65000,
      tauxTVA: 0,
      stock: 0,
      stockMin: 2,
      categorieId: catTransmission?.id || undefined,
      fournisseurId: fournYYMP?.id || undefined,
      actif: true
    }
  });
  console.log('  Créé: Glisseur 5ML (' + glisseurSml.reference + ')');

  // Mapping des achats client
  const achats = [
    { ref: 'YMP-056', qte: 1 },   // Courroie 784
    { ref: 'FMT-026', qte: 1 },   // Marchelotte 5ML
    { ref: 'FMT-003', qte: 1 },   // Ressort de Poussé Jog 1500
    { ref: 'ADC-058', qte: 1 },   // Poignet Domino L
    { ref: 'YMP-025', qte: 1 },   // Pale 5ML
    { ref: 'FMT-022', qte: 1 },   // Chaine 2*3-198
    { ref: 'YMP-075', qte: 1 },   // Rampe 5ML
    { ref: 'ADC-065', qte: 1 },   // Joint 5ML (nouveau)
    { ref: 'YMP-081', qte: 1 },   // Glisseur 5ML (nouveau)
    { ref: 'FMT-064', qte: 3 },   // Bille Jog 3g a 10g
  ];

  console.log('\n--- Enregistrement des sorties de stock ---');

  for (const achat of achats) {
    const piece = await prisma.piece.findUnique({ where: { reference: achat.ref } });
    if (!piece) {
      console.log('  ERREUR: Pièce ' + achat.ref + ' non trouvée');
      continue;
    }

    const stockAvant = piece.stock;
    const stockApres = Math.max(0, stockAvant - achat.qte);

    await prisma.piece.update({
      where: { id: piece.id },
      data: { stock: stockApres }
    });

    await prisma.mouvementStock.create({
      data: {
        type: 'SORTIE',
        quantite: achat.qte,
        quantiteAvant: stockAvant,
        quantiteApres: stockApres,
        motif: 'Vente client - Premier achat',
        reference: 'VENTE-2025-001',
        pieceId: piece.id,
        userId: admin.id
      }
    });

    console.log('  [SORTIE] ' + piece.nom + ' | -' + achat.qte + ' | stock: ' + stockAvant + ' → ' + stockApres);
  }

  console.log('\n=== Vente enregistrée avec succès ===');
}

enregistrerVente()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
