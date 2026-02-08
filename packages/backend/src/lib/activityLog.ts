import { prisma } from "../index.js";

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  boutiqueId?: string,
) {
  try {
    // If boutiqueId not provided, get it from the user
    let bId = boutiqueId;
    if (!bId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { boutiqueId: true },
      });
      bId = user?.boutiqueId ?? undefined;
    }
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId, details, boutiqueId: bId },
    });
  } catch (error) {
    console.error("Erreur lors du log d'activité:", error);
  }
}
