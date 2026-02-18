/**
 * Fonctions de sérialisation des Decimal Prisma → number pour le JSON.
 * Centralise les conversions répétées dans chaque route.
 */

// ---------- Pièces ----------

export function serializePiece<
  T extends {
    prixVente: unknown;
    prixAchat: unknown;
    tauxTVA: unknown;
    poids: unknown;
    prixPromo: unknown;
  },
>(p: T) {
  return {
    ...p,
    prixVente: Number(p.prixVente),
    prixAchat: p.prixAchat ? Number(p.prixAchat) : null,
    tauxTVA: Number(p.tauxTVA),
    poids: p.poids ? Number(p.poids) : null,
    prixPromo: p.prixPromo ? Number(p.prixPromo) : null,
  };
}

// ---------- Factures ----------

interface FactureItemRaw {
  prixUnitaire: unknown;
  remise: unknown;
  tva: unknown;
  total: unknown;
}

export function serializeFactureItem<T extends FactureItemRaw>(i: T) {
  return {
    ...i,
    prixUnitaire: Number(i.prixUnitaire),
    remise: Number(i.remise),
    tva: Number(i.tva),
    total: Number(i.total),
  };
}

export function serializeFacture<
  T extends {
    sousTotal: unknown;
    remise: unknown;
    remisePourcent: unknown;
    tva: unknown;
    total: unknown;
    montantPaye: unknown;
    items?: FactureItemRaw[];
  },
>(f: T) {
  return {
    ...f,
    sousTotal: Number(f.sousTotal),
    remise: Number(f.remise),
    remisePourcent: Number(f.remisePourcent),
    tva: Number(f.tva),
    total: Number(f.total),
    montantPaye: Number(f.montantPaye),
    ...(f.items ? { items: f.items.map(serializeFactureItem) } : {}),
  };
}

// ---------- Achats ----------

interface AchatItemRaw {
  prixUnitaire: unknown;
  tva: unknown;
  total: unknown;
}

export function serializeAchatItem<T extends AchatItemRaw>(i: T) {
  return {
    ...i,
    prixUnitaire: Number(i.prixUnitaire),
    tva: Number(i.tva),
    total: Number(i.total),
  };
}

export function serializeAchat<
  T extends {
    sousTotal: unknown;
    tva: unknown;
    total: unknown;
    items?: AchatItemRaw[];
  },
>(a: T) {
  return {
    ...a,
    sousTotal: Number(a.sousTotal),
    tva: Number(a.tva),
    total: Number(a.total),
    ...(a.items ? { items: a.items.map(serializeAchatItem) } : {}),
  };
}

// ---------- Devis ----------

export function serializeDevisItem<T extends FactureItemRaw>(i: T) {
  return {
    ...i,
    prixUnitaire: Number(i.prixUnitaire),
    remise: Number(i.remise),
    tva: Number(i.tva),
    total: Number(i.total),
  };
}

export function serializeDevis<
  T extends {
    sousTotal: unknown;
    remise: unknown;
    remisePourcent: unknown;
    tva: unknown;
    total: unknown;
    items?: FactureItemRaw[];
  },
>(d: T) {
  return {
    ...d,
    sousTotal: Number(d.sousTotal),
    remise: Number(d.remise),
    remisePourcent: Number(d.remisePourcent),
    tva: Number(d.tva),
    total: Number(d.total),
    ...(d.items ? { items: d.items.map(serializeDevisItem) } : {}),
  };
}

// ---------- Avoirs ----------

export function serializeAvoirItem<T extends { prixUnitaire: unknown; tva: unknown; total: unknown }>(i: T) {
  return {
    ...i,
    prixUnitaire: Number(i.prixUnitaire),
    tva: Number(i.tva),
    total: Number(i.total),
  };
}

export function serializeAvoir<
  T extends {
    sousTotal: unknown;
    tva: unknown;
    total: unknown;
    items?: { prixUnitaire: unknown; tva: unknown; total: unknown }[];
  },
>(a: T) {
  return {
    ...a,
    sousTotal: Number(a.sousTotal),
    tva: Number(a.tva),
    total: Number(a.total),
    ...(a.items ? { items: a.items.map(serializeAvoirItem) } : {}),
  };
}

// ---------- Historique prix ----------

export function serializeHistoriquePrix<
  T extends {
    prixVente: unknown;
    prixAchat: unknown;
  },
>(h: T) {
  return {
    ...h,
    prixVente: Number(h.prixVente),
    prixAchat: h.prixAchat ? Number(h.prixAchat) : null,
  };
}
