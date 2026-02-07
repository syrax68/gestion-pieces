export interface Piece {
  id: string;
  reference: string;
  nom: string;
  marque: string;
  categorie: string;
  description?: string;
  prix: number;
  prixAchat?: number;
  stock: number;
  stockMin: number;
  emplacement?: string;
  fournisseur?: string;
  dateAjout: string;
  derniereMaj: string;
  modeles?: string[];
}

export interface Categorie {
  id: string;
  nom: string;
  description?: string;
}

export interface Marque {
  id: string;
  nom: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  contact?: string;
  email?: string;
  telephone?: string;
}

export interface MouvementStock {
  id: string;
  pieceId: string;
  type: "entree" | "sortie" | "ajustement";
  quantite: number;
  motif: string;
  date: string;
  utilisateur?: string;
}

export interface Commande {
  id: string;
  numero: string;
  fournisseurId: string;
  fournisseurNom: string;
  dateCommande: string;
  dateLivraison?: string;
  statut: "en_attente" | "confirmee" | "livree" | "annulee";
  total: number;
  items: CommandeItem[];
}

export interface CommandeItem {
  id: string;
  pieceId: string;
  pieceNom: string;
  pieceReference: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Achat {
  id: string;
  numero: string;
  dateAchat: string;
  total: number;
  statut: "payee" | "en_attente" | "annulee";
  items: AchatItem[];
  notes?: string;
}

export interface AchatItem {
  id: string;
  pieceId: string;
  pieceNom: string;
  pieceReference: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

export interface Client {
  id: string;
  nom: string;
  prenom?: string;
  entreprise?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
}

export interface Facture {
  id: string;
  numero: string;
  dateFacture: string;
  clientId?: string;
  clientNom: string;
  clientAdresse?: string;
  clientTelephone?: string;
  items: FactureItem[];
  sousTotal: number;
  tva: number;
  total: number;
  statut: "payee" | "en_attente" | "annulee";
  methodePaiement?: string;
  notes?: string;
}

export interface FactureItem {
  id: string;
  pieceId: string;
  pieceNom: string;
  pieceReference: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}
