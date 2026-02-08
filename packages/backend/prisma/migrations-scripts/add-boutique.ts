/**
 * Script de migration : crée une boutique par défaut et assigne toutes les
 * données existantes à cette boutique.
 *
 * Exécution : npx tsx prisma/migrations-scripts/add-boutique.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migration multi-boutique...\n");

  // 1. Créer la boutique par défaut
  let boutique = await prisma.boutique.findFirst();
  if (!boutique) {
    boutique = await prisma.boutique.create({
      data: {
        nom: "Ma Boutique",
        actif: true,
      },
    });
    console.log("✅ Boutique créée :", boutique.nom, `(${boutique.id})`);
  } else {
    console.log("ℹ️  Boutique existante :", boutique.nom, `(${boutique.id})`);
  }

  const boutiqueId = boutique.id;

  // 2. Assigner toutes les entités à cette boutique
  const tables = [
    { name: "user", model: prisma.user },
    { name: "piece", model: prisma.piece },
    { name: "categorie", model: prisma.categorie },
    { name: "sousCategorie", model: prisma.sousCategorie },
    { name: "marque", model: prisma.marque },
    { name: "emplacement", model: prisma.emplacement },
    { name: "fournisseur", model: prisma.fournisseur },
    { name: "client", model: prisma.client },
    { name: "achat", model: prisma.achat },
    { name: "facture", model: prisma.facture },
    { name: "devis", model: prisma.devis },
    { name: "avoir", model: prisma.avoir },
    { name: "inventaire", model: prisma.inventaire },
    { name: "mouvementStock", model: prisma.mouvementStock },
    { name: "activityLog", model: prisma.activityLog },
  ] as const;

  for (const table of tables) {
    try {
      const result = await (table.model as any).updateMany({
        where: { boutiqueId: null },
        data: { boutiqueId },
      });
      if (result.count > 0) {
        console.log(`  ✅ ${table.name}: ${result.count} enregistrement(s) mis à jour`);
      } else {
        console.log(`  ⏭️  ${table.name}: aucun enregistrement à mettre à jour`);
      }
    } catch (error) {
      console.error(`  ❌ ${table.name}: erreur`, error);
    }
  }

  console.log("\n✅ Migration terminée !");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
