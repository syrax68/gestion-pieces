import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function creerFacture() {
  console.log('=== Création de la facture pour la première vente ===\n');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Admin not found');

  // Les pièces vendues avec leurs prix de vente
  const ventePieces = [
    { ref: 'YMP-056', qte: 1 },   // Courroie 784
    { ref: 'FMT-026', qte: 1 },   // Marchelotte 5ML
    { ref: 'FMT-003', qte: 1 },   // Ressort de Poussé Jog 1500
    { ref: 'ADC-058', qte: 1 },   // Poignet Domino L
    { ref: 'YMP-025', qte: 1 },   // Pale 5ML
    { ref: 'FMT-022', qte: 1 },   // Chaine 2*3-198
    { ref: 'YMP-075', qte: 1 },   // Rampe 5ML
    { ref: 'ADC-065', qte: 1 },   // Joint 5ML
    { ref: 'YMP-081', qte: 1 },   // Glisseur 5ML
    { ref: 'FMT-064', qte: 3 },   // Bille Jog 3g a 10g
  ];

  // Récupérer les pièces depuis la DB
  const items = [];
  for (const v of ventePieces) {
    const piece = await prisma.piece.findUnique({ where: { reference: v.ref } });
    if (!piece) {
      console.log('  ERREUR: ' + v.ref + ' non trouvée');
      continue;
    }
    const prixUnitaire = Number(piece.prixVente);
    const total = prixUnitaire * v.qte;
    items.push({
      pieceId: piece.id,
      designation: piece.nom,
      quantite: v.qte,
      prixUnitaire,
      remise: 0,
      tva: 0,
      total
    });
    console.log('  ' + piece.nom + ' x' + v.qte + ' @ ' + prixUnitaire.toLocaleString() + ' Fmg = ' + total.toLocaleString() + ' Fmg');
  }

  const sousTotal = items.reduce((sum, i) => sum + i.total, 0);
  const tvaTotal = sousTotal * 0.20;
  const total = sousTotal + tvaTotal;

  console.log('\n  Sous-total: ' + sousTotal.toLocaleString() + ' Fmg');
  console.log('  TVA (20%):  ' + tvaTotal.toLocaleString() + ' Fmg');
  console.log('  TOTAL:      ' + total.toLocaleString() + ' Fmg');

  // Créer la facture (sans toucher au stock, déjà fait)
  const facture = await prisma.facture.create({
    data: {
      numero: 'F2025-0001',
      createurId: admin.id,
      sousTotal,
      remise: 0,
      remisePourcent: 0,
      tva: tvaTotal,
      total,
      statut: 'PAYEE',
      methodePaiement: 'Espèces',
      datePaiement: new Date(),
      notes: 'Premier achat client - Client inconnu',
      items: {
        create: items.map(i => ({
          pieceId: i.pieceId,
          designation: i.designation,
          quantite: i.quantite,
          prixUnitaire: i.prixUnitaire,
          remise: i.remise,
          tva: i.tva,
          total: i.total
        }))
      }
    },
    include: {
      items: { include: { piece: true } }
    }
  });

  console.log('\n=== Facture créée: ' + facture.numero + ' ===');
  console.log('  Statut: PAYEE');
  console.log('  Articles: ' + facture.items.length);
  console.log('  Total: ' + total.toLocaleString() + ' Fmg');
}

creerFacture()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
