const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const BOUTIQUE_ID = import.meta.env.VITE_BOUTIQUE_ID || "";

const BASE = `${API_URL}/public/${BOUTIQUE_ID}`;

// ─── Types ────────────────────────────────────────────────────────────────

export interface BoutiqueInfo {
  id: string;
  nom: string;
  logo: string | null;
  adresse: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
}

export interface Categorie {
  id: string;
  nom: string;
  nbPieces: number;
}

export interface Marque {
  id: string;
  nom: string;
  nbPieces: number;
}

export interface PieceImage {
  url: string;
  alt: string | null;
}

export interface PieceListItem {
  id: string;
  reference: string;
  nom: string;
  description: string | null;
  prixVente: number;
  tauxTVA: number;
  prixPromo: number | null;
  enPromotion: boolean;
  stock: number;
  stockMin: number;
  marque: { id: string; nom: string } | null;
  categorie: { id: string; nom: string } | null;
  image: PieceImage | null;
}

export interface PieceDetail extends PieceListItem {
  poids: number | null;
  dimensions: string | null;
  sousCategorie: { id: string; nom: string } | null;
  images: Array<{ id: string; url: string; alt: string | null; ordre: number; principale: boolean }>;
  modelesCompatibles: Array<{
    notes: string | null;
    modele: {
      id: string;
      nom: string;
      type: string;
      anneeDebut: number | null;
      anneeFin: number | null;
      marque: { nom: string };
    };
  }>;
}

export interface PiecesResponse {
  data: PieceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PiecesParams {
  search?: string;
  categorieId?: string;
  marqueId?: string;
  page?: number;
  limit?: number;
}

export interface CommandePayload {
  clientNom: string;
  clientTelephone: string;
  items: Array<{ pieceId: string; quantite: number }>;
}

export interface CommandeResponse {
  success: boolean;
  numero: string;
  message: string;
}

export interface CommandeItem {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export type StatutCommande = "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE" | "EXPIRE";

export interface Commande {
  id: string;
  numero: string;
  dateDevis: string;
  statut: StatutCommande;
  total: number;
  notes: string | null;
  items: CommandeItem[];
}

export interface MesCommandesResponse {
  clientNom: string | null;
  commandes: Commande[];
}

// ─── Client HTTP ──────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

async function post<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

// ─── API publique ─────────────────────────────────────────────────────────

export const publicApi = {
  getBoutique: () => get<BoutiqueInfo>("/boutique"),
  getCategories: () => get<Categorie[]>("/categories"),
  getMarques: () => get<Marque[]>("/marques"),
  getPieces: (params?: PiecesParams) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.categorieId) qs.set("categorieId", params.categorieId);
    if (params?.marqueId) qs.set("marqueId", params.marqueId);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return get<PiecesResponse>(`/pieces${query ? `?${query}` : ""}`);
  },
  getPiece: (id: string) => get<PieceDetail>(`/pieces/${id}`),
  createCommande: (data: CommandePayload) => post<CommandeResponse>("/commandes", data),
  getMesCommandes: (telephone: string) =>
    get<MesCommandesResponse>(`/mes-commandes?telephone=${encodeURIComponent(telephone)}`),
};
