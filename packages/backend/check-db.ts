import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log("=== Vérification de la base de données ===\n");

    // Boutiques
    const boutiques = await prisma.boutique.findMany({
      include: {
        _count: {
          select: { users: true, pieces: true, factures: true },
        },
      },
    });
    console.log(`Boutiques (${boutiques.length}) :`);
    boutiques.forEach((b) => {
      console.log(`  - ${b.nom} (${b.id}) - ${b._count.users} users, ${b._count.pieces} pièces, ${b._count.factures} factures`);
    });

    // Users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        role: true,
        boutiqueId: true,
        boutique: { select: { nom: true } },
      },
    });
    console.log(`\nUtilisateurs (${users.length}) :`);
    users.forEach((u) => {
      console.log(`  - ${u.email} (${u.role}) - Boutique: ${u.boutique?.nom || "Aucune"}`);
    });
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
