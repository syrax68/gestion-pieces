import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixSuperAdmin() {
  try {
    console.log("=== Correction du super admin ===\n");

    // Retirer la boutique du super admin
    const updated = await prisma.user.updateMany({
      where: { role: "SUPER_ADMIN" },
      data: { boutiqueId: null },
    });

    console.log(`${updated.count} super admin(s) mis à jour (boutiqueId = null)`);

    // Vérifier
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { email: true, nom: true, boutiqueId: true },
    });

    console.log("\nSuper admins après correction :");
    superAdmins.forEach((sa) => {
      console.log(`  - ${sa.email} (${sa.nom}) - Boutique: ${sa.boutiqueId || "Aucune ✓"}`);
    });
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdmin();
