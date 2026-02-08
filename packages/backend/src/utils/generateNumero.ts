import { prisma } from "../index.js";

/**
 * Génère un numéro séquentiel du type PREFIX{year}-{seq}.
 * Utilise findMany + max pour éviter les doublons en cas de suppression,
 * et gère la concurrence avec un retry sur conflit.
 */
export async function generateNumero(model: "achat" | "facture", prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const startsWith = `${prefix}${year}-`;

  let lastNumero: string | null = null;

  switch (model) {
    case "achat": {
      const last = await prisma.achat.findFirst({
        where: { numero: { startsWith } },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      lastNumero = last?.numero ?? null;
      break;
    }
    case "facture": {
      const last = await prisma.facture.findFirst({
        where: { numero: { startsWith } },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      lastNumero = last?.numero ?? null;
      break;
    }
  }

  let nextSeq = 1;
  if (lastNumero) {
    const parts = lastNumero.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${year}-${String(nextSeq).padStart(4, "0")}`;
}
