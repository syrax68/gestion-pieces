import { Piece, Achat, MouvementStock, Fournisseur, Facture, Client } from "@/types";

const STORAGE_KEYS = {
  PIECES: "gestion_moto_pieces",
  ACHATS: "gestion_moto_achats",
  MOUVEMENTS: "gestion_moto_mouvements",
  FOURNISSEURS: "gestion_moto_fournisseurs",
  FACTURES: "gestion_moto_factures",
  CLIENTS: "gestion_moto_clients",
};

// Pièces
export const getPieces = (): Piece[] => {
  const data = localStorage.getItem(STORAGE_KEYS.PIECES);
  return data ? JSON.parse(data) : [];
};

export const savePieces = (pieces: Piece[]): void => {
  localStorage.setItem(STORAGE_KEYS.PIECES, JSON.stringify(pieces));
};

export const addPiece = (piece: Piece): void => {
  const pieces = getPieces();
  pieces.push(piece);
  savePieces(pieces);
};

export const updatePiece = (id: string, updatedPiece: Piece): void => {
  const pieces = getPieces();
  const index = pieces.findIndex((p) => p.id === id);
  if (index !== -1) {
    pieces[index] = updatedPiece;
    savePieces(pieces);
  }
};

export const deletePiece = (id: string): void => {
  const pieces = getPieces();
  const filtered = pieces.filter((p) => p.id !== id);
  savePieces(filtered);
};

export const getPieceById = (id: string): Piece | undefined => {
  const pieces = getPieces();
  return pieces.find((p) => p.id === id);
};

// Achats
export const getAchats = (): Achat[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ACHATS);
  return data ? JSON.parse(data) : [];
};

export const saveAchats = (achats: Achat[]): void => {
  localStorage.setItem(STORAGE_KEYS.ACHATS, JSON.stringify(achats));
};

export const addAchat = (achat: Achat): void => {
  const achats = getAchats();
  achats.push(achat);
  saveAchats(achats);

  // Mettre à jour le stock automatiquement
  achat.items.forEach((item) => {
    const piece = getPieceById(item.pieceId);
    if (piece) {
      updatePiece(item.pieceId, {
        ...piece,
        stock: piece.stock + item.quantite,
        derniereMaj: new Date().toISOString(),
      });

      // Ajouter un mouvement de stock
      addMouvementStock({
        id: `mvt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pieceId: item.pieceId,
        type: "entree",
        quantite: item.quantite,
        motif: `Achat ${achat.numero}`,
        date: new Date().toISOString(),
      });
    }
  });
};

export const updateAchat = (id: string, updatedAchat: Achat): void => {
  const achats = getAchats();
  const index = achats.findIndex((a) => a.id === id);
  if (index !== -1) {
    achats[index] = updatedAchat;
    saveAchats(achats);
  }
};

export const deleteAchat = (id: string): void => {
  const achats = getAchats();
  const filtered = achats.filter((a) => a.id !== id);
  saveAchats(filtered);
};

// Mouvements de stock
export const getMouvementsStock = (): MouvementStock[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
  return data ? JSON.parse(data) : [];
};

export const saveMouvementsStock = (mouvements: MouvementStock[]): void => {
  localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(mouvements));
};

export const addMouvementStock = (mouvement: MouvementStock): void => {
  const mouvements = getMouvementsStock();
  mouvements.push(mouvement);
  saveMouvementsStock(mouvements);
};

export const getMouvementsByPiece = (pieceId: string): MouvementStock[] => {
  const mouvements = getMouvementsStock();
  return mouvements.filter((m) => m.pieceId === pieceId);
};

// Fournisseurs
export const getFournisseurs = (): Fournisseur[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FOURNISSEURS);
  return data ? JSON.parse(data) : getDefaultFournisseurs();
};

export const saveFournisseurs = (fournisseurs: Fournisseur[]): void => {
  localStorage.setItem(STORAGE_KEYS.FOURNISSEURS, JSON.stringify(fournisseurs));
};

export const addFournisseur = (fournisseur: Fournisseur): void => {
  const fournisseurs = getFournisseurs();
  fournisseurs.push(fournisseur);
  saveFournisseurs(fournisseurs);
};

// Données par défaut
const getDefaultFournisseurs = (): Fournisseur[] => {
  const defaultFournisseurs = [
    { id: "f1", nom: "Moto Parts Direct", email: "contact@motoparts.fr", telephone: "01 23 45 67 89" },
    { id: "f2", nom: "Speed Racing", email: "info@speedracing.fr", telephone: "01 98 76 54 32" },
    { id: "f3", nom: "Bike Components", email: "sales@bikecomp.fr", telephone: "02 34 56 78 90" },
  ];
  saveFournisseurs(defaultFournisseurs);
  return defaultFournisseurs;
};

// Initialiser avec des données de démonstration si vide
export const initializeDefaultData = (): void => {
  if (getPieces().length === 0) {
    const defaultPieces: Piece[] = [
      {
        id: "1",
        reference: "FO-MT07-001",
        nom: "Filtre à huile Yamaha MT-07",
        marque: "Yamaha",
        categorie: "Filtration",
        description: "Filtre à huile d'origine pour Yamaha MT-07",
        prix: 12.5,
        prixAchat: 8.0,
        stock: 15,
        stockMin: 5,
        emplacement: "A1-B3",
        fournisseur: "Moto Parts Direct",
        dateAjout: new Date().toISOString(),
        derniereMaj: new Date().toISOString(),
        modeles: ["MT-07", "XSR700"],
      },
      {
        id: "2",
        reference: "PF-CBR600-023",
        nom: "Plaquettes de frein Honda CBR600",
        marque: "Honda",
        categorie: "Freinage",
        description: "Plaquettes de frein avant haute performance",
        prix: 45.9,
        prixAchat: 30.0,
        stock: 8,
        stockMin: 3,
        emplacement: "B2-C1",
        fournisseur: "Speed Racing",
        dateAjout: new Date().toISOString(),
        derniereMaj: new Date().toISOString(),
        modeles: ["CBR600RR", "CBR600F"],
      },
      {
        id: "3",
        reference: "CH-DID520-120",
        nom: "Chaîne DID 520 - 120 maillons",
        marque: "DID",
        categorie: "Transmission",
        description: "Chaîne de transmission renforcée",
        prix: 89.0,
        prixAchat: 60.0,
        stock: 6,
        stockMin: 2,
        emplacement: "C3-D1",
        fournisseur: "Bike Components",
        dateAjout: new Date().toISOString(),
        derniereMaj: new Date().toISOString(),
        modeles: ["Universel"],
      },
    ];
    savePieces(defaultPieces);
  }
};

// Factures
export const getFactures = (): Facture[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FACTURES);
  return data ? JSON.parse(data) : [];
};

export const saveFactures = (factures: Facture[]): void => {
  localStorage.setItem(STORAGE_KEYS.FACTURES, JSON.stringify(factures));
};

export const addFacture = (facture: Facture): void => {
  const factures = getFactures();
  factures.push(facture);
  saveFactures(factures);

  // Mettre à jour le stock automatiquement (sortie de stock)
  facture.items.forEach((item) => {
    const piece = getPieceById(item.pieceId);
    if (piece) {
      updatePiece(item.pieceId, {
        ...piece,
        stock: Math.max(0, piece.stock - item.quantite),
        derniereMaj: new Date().toISOString(),
      });

      // Ajouter un mouvement de stock
      addMouvementStock({
        id: `mvt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pieceId: item.pieceId,
        type: "sortie",
        quantite: item.quantite,
        motif: `Vente facture ${facture.numero}`,
        date: new Date().toISOString(),
      });
    }
  });
};

export const updateFacture = (id: string, updatedFacture: Facture): void => {
  const factures = getFactures();
  const index = factures.findIndex((f) => f.id === id);
  if (index !== -1) {
    factures[index] = updatedFacture;
    saveFactures(factures);
  }
};

export const deleteFacture = (id: string): void => {
  const factures = getFactures();
  const filtered = factures.filter((f) => f.id !== id);
  saveFactures(filtered);
};

export const getFactureById = (id: string): Facture | undefined => {
  const factures = getFactures();
  return factures.find((f) => f.id === id);
};

// Clients
export const getClients = (): Client[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
  return data ? JSON.parse(data) : [];
};

export const saveClients = (clients: Client[]): void => {
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
};

export const addClient = (client: Client): void => {
  const clients = getClients();
  clients.push(client);
  saveClients(clients);
};

export const updateClient = (id: string, updatedClient: Client): void => {
  const clients = getClients();
  const index = clients.findIndex((c) => c.id === id);
  if (index !== -1) {
    clients[index] = updatedClient;
    saveClients(clients);
  }
};

export const deleteClient = (id: string): void => {
  const clients = getClients();
  const filtered = clients.filter((c) => c.id !== id);
  saveClients(filtered);
};

export const getClientById = (id: string): Client | undefined => {
  const clients = getClients();
  return clients.find((c) => c.id === id);
};

// Générer le prochain numéro de facture
export const getNextFactureNumber = (): string => {
  const factures = getFactures();
  const currentYear = new Date().getFullYear();
  const yearFactures = factures.filter((f) => f.numero.startsWith(`F${currentYear}`));
  const nextNumber = yearFactures.length + 1;
  return `F${currentYear}-${String(nextNumber).padStart(4, "0")}`;
};
