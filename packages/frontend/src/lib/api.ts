const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const getToken = () => localStorage.getItem("token");

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Une erreur est survenue" }));
    throw new ApiError(response.status, error.error || error.message || "Erreur");
  }
  return response.json();
};

const headers = (): HeadersInit => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: headers() });
    return handleResponse<T>(res);
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return handleResponse<T>(res);
  },

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(res);
  },

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(res);
  },

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handleResponse<T>(res);
  },
};

// Types
export interface User {
  id: string;
  email: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "VENDEUR" | "LECTEUR";
  actif: boolean;
  boutiqueId?: string;
  boutique?: Boutique;
  createdAt: string;
}

export interface Boutique {
  id: string;
  nom: string;
  adresse?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  logo?: string;
  siret?: string;
  actif: boolean;
  _count?: { users: number; pieces: number; factures: number; clients: number };
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Emplacement {
  id: string;
  code: string;
  nom?: string;
  zone?: string;
  description?: string;
  actif: boolean;
}

export interface SousCategorie {
  id: string;
  nom: string;
  description?: string;
  ordre: number;
  actif: boolean;
  categorieId: string;
}

export interface Categorie {
  id: string;
  nom: string;
  description?: string;
  icone?: string;
  ordre: number;
  actif: boolean;
  sousCategories?: SousCategorie[];
  _count?: { pieces: number };
}

export interface Marque {
  id: string;
  nom: string;
  logo?: string;
  description?: string;
  siteWeb?: string;
  actif: boolean;
  _count?: { pieces: number };
}

export interface ModeleVehicule {
  id: string;
  nom: string;
  anneeDebut?: number;
  anneeFin?: number;
  cylindree?: number;
  type: "MOTO" | "SCOOTER" | "QUAD" | "AUTRE";
  actif: boolean;
  marqueId: string;
  marque?: Marque;
}

export interface PieceModeleVehicule {
  id: string;
  pieceId: string;
  modeleId: string;
  notes?: string;
  modele?: ModeleVehicule;
}

export interface PieceFournisseur {
  id: string;
  pieceId: string;
  fournisseurId: string;
  referenceFournisseur?: string;
  prixAchat: number;
  delaiLivraison?: number;
  quantiteMin: number;
  principal: boolean;
  fournisseur?: Fournisseur;
}

export interface Image {
  id: string;
  url: string;
  alt?: string;
  ordre: number;
  principale: boolean;
  pieceId: string;
}

export interface HistoriquePrix {
  id: string;
  pieceId: string;
  prixVente: number;
  prixAchat?: number;
  dateChangement: string;
  motif?: string;
}

export interface Piece {
  id: string;
  reference: string;
  codeBarres?: string;
  nom: string;
  description?: string;
  prixVente: number;
  prixAchat?: number;
  tauxTVA: number;
  stock: number;
  stockMin: number;
  stockMax?: number;
  poids?: number;
  dimensions?: string;
  actif: boolean;
  enPromotion: boolean;
  prixPromo?: number;
  marqueId?: string;
  marque?: Marque;
  categorieId?: string;
  categorie?: Categorie;
  sousCategorieId?: string;
  sousCategorie?: SousCategorie;
  fournisseurId?: string;
  fournisseur?: Fournisseur;
  emplacementId?: string;
  emplacement?: Emplacement;
  images?: Image[];
  modelesCompatibles?: PieceModeleVehicule[];
  fournisseurs?: PieceFournisseur[];
  historiquePrix?: HistoriquePrix[];
  createdAt: string;
  updatedAt: string;
}

export interface Fournisseur {
  id: string;
  code?: string;
  nom: string;
  contact?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  pays: string;
  siret?: string;
  tva?: string;
  delaiLivraison?: number;
  conditions?: string;
  notes?: string;
  actif: boolean;
  _count?: { pieces: number };
}

export interface Client {
  id: string;
  code?: string;
  type: string;
  nom: string;
  prenom?: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
  telephoneMobile?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  pays: string;
  siret?: string;
  tva?: string;
  notes?: string;
  actif: boolean;
  _count?: { factures: number; devis: number };
}

export interface FactureItem {
  id: string;
  designation: string;
  description?: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  tva: number;
  total: number;
  factureId: string;
  pieceId?: string;
  piece?: Piece;
}

export interface Facture {
  id: string;
  numero: string;
  dateFacture: string;
  dateEcheance?: string;
  sousTotal: number;
  remise: number;
  remisePourcent: number;
  tva: number;
  total: number;
  montantPaye: number;
  statut: "BROUILLON" | "EN_ATTENTE" | "PAYEE" | "PARTIELLEMENT_PAYEE" | "ANNULEE";
  methodePaiement?: string;
  datePaiement?: string;
  notes?: string;
  notesInternes?: string;
  clientId?: string;
  client?: Client;
  createurId: string;
  createur?: User;
  devisId?: string;
  items: FactureItem[];
}

export interface DevisItem {
  id: string;
  designation: string;
  description?: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  tva: number;
  total: number;
  devisId: string;
  pieceId?: string;
  piece?: Piece;
}

export interface Devis {
  id: string;
  numero: string;
  dateDevis: string;
  dateValidite: string;
  statut: "BROUILLON" | "ENVOYE" | "ACCEPTE" | "REFUSE" | "EXPIRE";
  sousTotal: number;
  remise: number;
  remisePourcent: number;
  tva: number;
  total: number;
  conditions?: string;
  notes?: string;
  notesInternes?: string;
  clientId?: string;
  client?: Client;
  createurId: string;
  createur?: User;
  items: DevisItem[];
}

export interface AvoirItem {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  total: number;
  retourStock: boolean;
  avoirId: string;
  pieceId?: string;
  piece?: Piece;
}

export interface Avoir {
  id: string;
  numero: string;
  dateAvoir: string;
  motif: string;
  sousTotal: number;
  tva: number;
  total: number;
  statut: "EN_ATTENTE" | "VALIDE" | "REMBOURSE";
  notes?: string;
  clientId?: string;
  client?: Client;
  factureId?: string;
  facture?: { id: string; numero: string; statut: string };
  items: AvoirItem[];
}

export interface InventaireItem {
  id: string;
  stockTheorique: number;
  stockPhysique: number | null;
  ecart: number | null;
  notes?: string;
  valide: boolean;
  inventaireId: string;
  pieceId: string;
  piece?: { id: string; reference: string; nom: string; stock: number };
}

export interface Inventaire {
  id: string;
  numero: string;
  dateDebut: string;
  dateFin?: string;
  statut: "EN_COURS" | "VALIDE" | "ANNULE";
  notes?: string;
  ecartTotal: number;
  userId: string;
  user?: { id: string; nom: string; prenom?: string };
  items: InventaireItem[];
  _count?: { items: number };
}

export interface AchatItem {
  id: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  total: number;
  achatId: string;
  pieceId: string;
  piece?: Piece;
}

export interface Achat {
  id: string;
  numero: string;
  numeroFacture?: string;
  dateAchat: string;
  dateFacture?: string;
  sousTotal: number;
  tva: number;
  total: number;
  statut: "EN_ATTENTE" | "PAYEE" | "ANNULEE";
  notes?: string;
  fournisseurId?: string;
  fournisseur?: Fournisseur;
  items: AchatItem[];
}

export interface MouvementStock {
  id: string;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT" | "INVENTAIRE" | "RETOUR" | "TRANSFERT";
  quantite: number;
  quantiteAvant?: number;
  quantiteApres?: number;
  motif: string;
  reference?: string;
  date: string;
  pieceId: string;
  piece?: { nom: string; reference: string };
  userId?: string;
  user?: { nom: string; prenom?: string };
}

export interface DashboardStats {
  totalPieces: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockValue: number;
  recentMouvements: number;
  todaySales: number;
  monthlySales: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  userId: string;
  user?: { nom: string; prenom?: string; role?: string };
  createdAt: string;
}

export interface SalesChartData {
  mois: string;
  ventes: number;
  count: number;
}

export interface TopPieceData {
  nom: string;
  reference: string;
  quantite: number;
  total: number;
}

export interface StockOverviewData {
  categorie: string;
  valeur: number;
  count: number;
}

export interface BoutiqueStats {
  id: string;
  nom: string;
  ville?: string;
  todaySales: number;
  monthlySales: number;
  stockValue: number;
  totalPieces: number;
  facturesCount: number;
  salesChart: SalesChartData[];
}

export interface MultiBoutiqueData {
  boutiques: BoutiqueStats[];
  totals: {
    todaySales: number;
    monthlySales: number;
    stockValue: number;
    totalPieces: number;
    facturesCount: number;
  };
}

// API endpoints
export const authApi = {
  login: (email: string, password: string) => api.post<LoginResponse>("/auth/login", { email, password }),
  me: () => api.get<User>("/auth/me"),
  register: (data: { email: string; password: string; nom: string; prenom?: string; role?: string }) =>
    api.post<User>("/auth/register", data),
  getUsers: () => api.get<User[]>("/auth/users"),
  updateUser: (id: string, data: Partial<User & { password?: string }>) => api.put<User>(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/change-password", { currentPassword, newPassword }),
  resetPassword: (userId: string, newPassword: string) =>
    api.post<{ message: string }>(`/auth/reset-password/${userId}`, { newPassword }),
};

export const piecesApi = {
  getAll: (params?: { search?: string; categorie?: string; marque?: string; actif?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.categorie) searchParams.set("categorie", params.categorie);
    if (params?.marque) searchParams.set("marque", params.marque);
    if (params?.actif !== undefined) searchParams.set("actif", params.actif.toString());
    const query = searchParams.toString();
    return api.get<Piece[]>(`/pieces${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => api.get<Piece>(`/pieces/${id}`),
  create: (data: Partial<Piece>) => api.post<Piece>("/pieces", data),
  update: (id: string, data: Partial<Piece>) => api.put<Piece>(`/pieces/${id}`, data),
  delete: (id: string) => api.delete(`/pieces/${id}`),
  adjustStock: (id: string, data: { type: string; quantite: number; motif?: string; reference?: string }) =>
    api.post<Piece>(`/pieces/${id}/stock`, data),
  addCompatibility: (id: string, data: { modeleId: string; notes?: string }) =>
    api.post<PieceModeleVehicule>(`/pieces/${id}/modeles`, data),
  removeCompatibility: (id: string, modeleId: string) => api.delete(`/pieces/${id}/modeles/${modeleId}`),
  replace: (id: string, newPieceId: string) =>
    api.post<{
      message: string;
      oldPiece: { reference: string; nom: string };
      newPiece: { reference: string; nom: string };
      stats: Record<string, number>;
    }>(`/pieces/${id}/remplacer`, { newPieceId }),
};

export const imagesApi = {
  getByPiece: (pieceId: string) => api.get<Image[]>(`/images/${pieceId}`),
  upload: async (pieceId: string, file: File): Promise<Image> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API_URL}/images/${pieceId}`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: formData,
    });
    return handleResponse<Image>(res);
  },
  setPrincipale: (imageId: string) => api.patch<{ message: string }>(`/images/${imageId}/principale`, {}),
  delete: (imageId: string) => api.delete<{ message: string }>(`/images/${imageId}`),
};

export const categoriesApi = {
  getAll: () => api.get<Categorie[]>("/categories"),
  create: (data: Partial<Categorie>) => api.post<Categorie>("/categories", data),
  update: (id: string, data: Partial<Categorie>) => api.put<Categorie>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const marquesApi = {
  getAll: () => api.get<Marque[]>("/marques"),
  create: (data: Partial<Marque>) => api.post<Marque>("/marques", data),
  update: (id: string, data: Partial<Marque>) => api.put<Marque>(`/marques/${id}`, data),
  delete: (id: string) => api.delete(`/marques/${id}`),
};

export const fournisseursApi = {
  getAll: () => api.get<Fournisseur[]>("/fournisseurs"),
  getById: (id: string) => api.get<Fournisseur>(`/fournisseurs/${id}`),
  create: (data: Partial<Fournisseur>) => api.post<Fournisseur>("/fournisseurs", data),
  update: (id: string, data: Partial<Fournisseur>) => api.put<Fournisseur>(`/fournisseurs/${id}`, data),
  delete: (id: string) => api.delete(`/fournisseurs/${id}`),
};

export const clientsApi = {
  getAll: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return api.get<Client[]>(`/clients${query}`);
  },
  getById: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) => api.post<Client>("/clients", data),
  update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const facturesApi = {
  getAll: (params?: { statut?: string; clientId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.statut) searchParams.set("statut", params.statut);
    if (params?.clientId) searchParams.set("clientId", params.clientId);
    const query = searchParams.toString();
    return api.get<Facture[]>(`/factures${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => api.get<Facture>(`/factures/${id}`),
  create: (data: {
    clientId?: string;
    items: { pieceId?: string; designation: string; quantite: number; prixUnitaire: number; tva?: number }[];
    remise?: number;
    methodePaiement?: string;
    notes?: string;
  }) => api.post<Facture>("/factures", data),
  update: (
    id: string,
    data: {
      clientId?: string;
      items: { pieceId?: string; designation: string; quantite: number; prixUnitaire: number; tva?: number }[];
      remise?: number;
      methodePaiement?: string;
      notes?: string;
    },
  ) => api.put<Facture>(`/factures/${id}`, data),
  updateStatus: (id: string, statut: string, data?: { montantPaye?: number; methodePaiement?: string }) =>
    api.patch<Facture>(`/factures/${id}/statut`, { statut, ...data }),
  delete: (id: string) => api.delete(`/factures/${id}`),
};

export const devisApi = {
  getAll: (params?: { statut?: string; clientId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.statut) searchParams.set("statut", params.statut);
    if (params?.clientId) searchParams.set("clientId", params.clientId);
    const query = searchParams.toString();
    return api.get<Devis[]>(`/devis${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => api.get<Devis>(`/devis/${id}`),
  create: (data: {
    clientId?: string;
    dateValidite?: string;
    items: { pieceId?: string; designation: string; quantite: number; prixUnitaire: number; remise?: number; tva?: number }[];
    remise?: number;
    conditions?: string;
    notes?: string;
    notesInternes?: string;
  }) => api.post<Devis>("/devis", data),
  update: (
    id: string,
    data: {
      clientId?: string;
      dateValidite?: string;
      items: { pieceId?: string; designation: string; quantite: number; prixUnitaire: number; remise?: number; tva?: number }[];
      remise?: number;
      conditions?: string;
      notes?: string;
      notesInternes?: string;
    },
  ) => api.put<Devis>(`/devis/${id}`, data),
  updateStatus: (id: string, statut: string) => api.patch<Devis>(`/devis/${id}/statut`, { statut }),
  convertToFacture: (id: string) => api.post<Facture>(`/devis/${id}/convertir`),
  delete: (id: string) => api.delete(`/devis/${id}`),
};

export const avoirsApi = {
  getAll: (params?: { statut?: string; clientId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.statut) searchParams.set("statut", params.statut);
    if (params?.clientId) searchParams.set("clientId", params.clientId);
    const query = searchParams.toString();
    return api.get<Avoir[]>(`/avoirs${query ? `?${query}` : ""}`);
  },
  getById: (id: string) => api.get<Avoir>(`/avoirs/${id}`),
  create: (data: {
    clientId?: string;
    factureId?: string;
    motif: string;
    items: { pieceId?: string; designation: string; quantite: number; prixUnitaire: number; tva?: number; retourStock?: boolean }[];
    notes?: string;
  }) => api.post<Avoir>("/avoirs", data),
  updateStatus: (id: string, statut: string) => api.patch<Avoir>(`/avoirs/${id}/statut`, { statut }),
  delete: (id: string) => api.delete(`/avoirs/${id}`),
};

export const inventairesApi = {
  getAll: (statut?: string) => {
    const query = statut ? `?statut=${statut}` : "";
    return api.get<Inventaire[]>(`/inventaires${query}`);
  },
  getById: (id: string) => api.get<Inventaire>(`/inventaires/${id}`),
  create: (data: { notes?: string; pieceIds?: string[] }) =>
    api.post<Inventaire>("/inventaires", data),
  updateItem: (id: string, itemId: string, data: { stockPhysique: number; notes?: string }) =>
    api.put<InventaireItem>(`/inventaires/${id}/items/${itemId}`, data),
  updateStatus: (id: string, statut: string) =>
    api.patch<Inventaire>(`/inventaires/${id}/statut`, { statut }),
  delete: (id: string) => api.delete(`/inventaires/${id}`),
};

export const achatsApi = {
  getAll: (statut?: string) => {
    const query = statut ? `?statut=${statut}` : "";
    return api.get<Achat[]>(`/achats${query}`);
  },
  getById: (id: string) => api.get<Achat>(`/achats/${id}`),
  create: (data: {
    fournisseurId?: string;
    numeroFacture?: string;
    items: { pieceId: string; quantite: number; prixUnitaire: number; tva?: number }[];
    notes?: string;
  }) => api.post<Achat>("/achats", data),
  updateStatus: (id: string, statut: string) => api.patch<Achat>(`/achats/${id}/statut`, { statut }),
  delete: (id: string) => api.delete(`/achats/${id}`),
};

export const mouvementsApi = {
  getAll: (params?: { pieceId?: string; type?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.pieceId) searchParams.set("pieceId", params.pieceId);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    const query = searchParams.toString();
    return api.get<MouvementStock[]>(`/mouvements${query ? `?${query}` : ""}`);
  },
  getByPiece: (pieceId: string) => api.get<MouvementStock[]>(`/mouvements/piece/${pieceId}`),
};

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/dashboard/stats"),
  getRecent: () =>
    api.get<{
      pieces: Piece[];
      factures: Facture[];
      mouvements: MouvementStock[];
    }>("/dashboard/recent"),
  getLowStock: () => api.get<Piece[]>("/dashboard/low-stock"),
  getSalesChart: () => api.get<SalesChartData[]>("/dashboard/sales-chart"),
  getTopPieces: () => api.get<TopPieceData[]>("/dashboard/top-pieces"),
  getStockOverview: () => api.get<StockOverviewData[]>("/dashboard/stock-overview"),
  getActivitySummary: () => api.get<ActivityLog[]>("/dashboard/activity-summary"),
  getMultiBoutique: () => api.get<MultiBoutiqueData>("/dashboard/multi-boutique"),
};

export const activityApi = {
  getAll: (params?: { entity?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.entity) searchParams.set("entity", params.entity);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    const query = searchParams.toString();
    return api.get<{ logs: ActivityLog[]; total: number }>(`/activity${query ? `?${query}` : ""}`);
  },
};

export const boutiquesApi = {
  getAll: () => api.get<Boutique[]>("/boutiques"),
  getById: (id: string) => api.get<Boutique>(`/boutiques/${id}`),
  create: (data: Partial<Boutique>) => api.post<Boutique>("/boutiques", data),
  update: (id: string, data: Partial<Boutique>) => api.put<Boutique>(`/boutiques/${id}`, data),
  delete: (id: string) => api.delete(`/boutiques/${id}`),
};

const API_URL_RAW = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const exportApi = {
  downloadPieces: async () => {
    const token = getToken();
    const res = await fetch(`${API_URL_RAW}/export/pieces`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) throw new Error("Erreur export");
    const blob = await res.blob();
    downloadBlob(blob, `pieces_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
  downloadFactures: async (from?: string, to?: string) => {
    const token = getToken();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const res = await fetch(`${API_URL_RAW}/export/factures${query ? `?${query}` : ""}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) throw new Error("Erreur export");
    const blob = await res.blob();
    downloadBlob(blob, `factures_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
  downloadMouvements: async (from?: string, to?: string) => {
    const token = getToken();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    const res = await fetch(`${API_URL_RAW}/export/mouvements${query ? `?${query}` : ""}`, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) throw new Error("Erreur export");
    const blob = await res.blob();
    downloadBlob(blob, `mouvements_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { ApiError };
