import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Vérification Super Admin ===\n");

  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      role: true,
      boutiqueId: true,
      actif: true,
    },
  });

  if (superAdmins.length === 0) {
    console.log("❌ Aucun super admin trouvé");
    return;
  }

  superAdmins.forEach((admin) => {
    console.log(`Email: ${admin.email}`);
    console.log(`Nom: ${admin.nom} ${admin.prenom || ""}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Boutique ID: ${admin.boutiqueId || "null ✓"}`);
    console.log(`Actif: ${admin.actif ? "✓" : "✗"}`);
    console.log("");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
