/**
 * Filtres réutilisables pour les requêtes Prisma.
 */

/**
 * Construit un filtre de date { gte, lte } pour Prisma.
 */
export function buildDateFilter(from?: string, to?: string): Record<string, Date> | undefined {
  if (!from && !to) return undefined;

  const filter: Record<string, Date> = {};
  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);
  return filter;
}
