/**
 * Service de gestion du stock.
 * Centralise les mouvements d'entrée/sortie utilisés dans achats, factures et pièces.
 */

interface StockAdjustmentParams {
  /** Transaction Prisma active */
  tx: any;
  pieceId: string;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT" | "INVENTAIRE" | "RETOUR" | "TRANSFERT";
  quantite: number;
  motif: string;
  reference: string | null;
  userId: string;
  boutiqueId?: string;
}

/**
 * Ajuste le stock d'une pièce, crée le mouvement de stock associé
 * et retourne le nouveau stock.
 */
export async function adjustStock({
  tx,
  pieceId,
  type,
  quantite,
  motif,
  reference,
  userId,
  boutiqueId,
}: StockAdjustmentParams): Promise<{ oldStock: number; newStock: number }> {
  const piece = await tx.piece.findUnique({ where: { id: pieceId } });
  if (!piece) {
    throw new Error(`Pièce ${pieceId} non trouvée`);
  }

  const oldStock = piece.stock;
  let newStock: number;

  switch (type) {
    case "ENTREE":
    case "RETOUR":
      newStock = oldStock + quantite;
      break;
    case "SORTIE":
      newStock = oldStock - quantite;
      if (newStock < 0) {
        throw new Error(`Stock insuffisant pour la pièce ${piece.nom}`);
      }
      break;
    case "AJUSTEMENT":
    case "INVENTAIRE":
      newStock = quantite; // Valeur absolue
      break;
    case "TRANSFERT":
      newStock = oldStock - quantite;
      break;
    default:
      throw new Error(`Type de mouvement inconnu: ${type}`);
  }

  await tx.piece.update({
    where: { id: pieceId },
    data: { stock: newStock },
  });

  await tx.mouvementStock.create({
    data: {
      pieceId,
      type,
      quantite,
      quantiteAvant: oldStock,
      quantiteApres: newStock,
      motif,
      reference,
      userId,
      boutiqueId: boutiqueId || piece.boutiqueId || undefined,
    },
  });

  return { oldStock, newStock };
}
