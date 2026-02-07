import { prisma } from "../index.js";

/**
 * Génère un numéro séquentiel du type PREFIX{year}-{seq}.
 * Utilisé pour les achats, commandes et factures.
 */
export async function generateNumero(model: "achat" | "commande" | "facture", prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const startsWith = `${prefix}${year}`;

  let count: number;
  switch (model) {
    case "achat":
      count = await prisma.achat.count({ where: { numero: { startsWith } } });
      break;
    case "commande":
      count = await prisma.commande.count({ where: { numero: { startsWith } } });
      break;
    case "facture":
      count = await prisma.facture.count({ where: { numero: { startsWith } } });
      break;
  }

  return `${prefix}${year}-${String(count + 1).padStart(4, "0")}`;
}
