import { prisma } from '../index.js';

export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId, details }
    });
  } catch (error) {
    console.error('Erreur lors du log d\'activité:', error);
  }
}
