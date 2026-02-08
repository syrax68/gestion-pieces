import { PrismaClient, TypeVehicule } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============================================
  // BOUTIQUE PAR DÉFAUT
  // ============================================
  const boutique = await prisma.boutique.upsert({
    where: { id: "default-boutique" },
    update: {},
    create: {
      id: "default-boutique",
      nom: "Ma Boutique Moto",
      actif: true,
    },
  });
  console.log("Created boutique:", boutique.nom);

  // ============================================
  // UTILISATEURS
  // ============================================
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { boutiqueId: boutique.id },
    create: {
      email: "admin@example.com",
      password: adminPassword,
      nom: "Admin",
      prenom: "System",
      role: "ADMIN",
      actif: true,
      boutiqueId: boutique.id,
    },
  });
  console.log("Created admin user:", admin.email);

  const vendeurPassword = await bcrypt.hash("vendeur123", 10);
  const vendeur = await prisma.user.upsert({
    where: { email: "vendeur@example.com" },
    update: { boutiqueId: boutique.id },
    create: {
      email: "vendeur@example.com",
      password: vendeurPassword,
      nom: "Martin",
      prenom: "Pierre",
      telephone: "06 11 22 33 44",
      role: "VENDEUR",
      actif: true,
      boutiqueId: boutique.id,
    },
  });
  console.log("Created vendeur user:", vendeur.email);

  const lecteurPassword = await bcrypt.hash("lecteur123", 10);
  const lecteur = await prisma.user.upsert({
    where: { email: "lecteur@example.com" },
    update: { boutiqueId: boutique.id },
    create: {
      email: "lecteur@example.com",
      password: lecteurPassword,
      nom: "Durand",
      prenom: "Marie",
      role: "LECTEUR",
      actif: true,
      boutiqueId: boutique.id,
    },
  });
  console.log("Created lecteur user:", lecteur.email);

  // ============================================
  // EMPLACEMENTS
  // ============================================
  const emplacements = await Promise.all([
    prisma.emplacement.upsert({
      where: { code: "A1-B1" },
      update: {},
      create: { code: "A1-B1", nom: "Allée A, Étagère 1, Niveau B1", zone: "Zone A" },
    }),
    prisma.emplacement.upsert({
      where: { code: "A1-B2" },
      update: {},
      create: { code: "A1-B2", nom: "Allée A, Étagère 1, Niveau B2", zone: "Zone A" },
    }),
    prisma.emplacement.upsert({
      where: { code: "A1-B3" },
      update: {},
      create: { code: "A1-B3", nom: "Allée A, Étagère 1, Niveau B3", zone: "Zone A" },
    }),
    prisma.emplacement.upsert({
      where: { code: "A2-B1" },
      update: {},
      create: { code: "A2-B1", nom: "Allée A, Étagère 2, Niveau B1", zone: "Zone A" },
    }),
    prisma.emplacement.upsert({
      where: { code: "B2-C1" },
      update: {},
      create: { code: "B2-C1", nom: "Allée B, Étagère 2, Niveau C1", zone: "Zone B" },
    }),
    prisma.emplacement.upsert({
      where: { code: "C3-D1" },
      update: {},
      create: { code: "C3-D1", nom: "Allée C, Étagère 3, Niveau D1", zone: "Zone C" },
    }),
  ]);
  console.log("Created", emplacements.length, "emplacements");

  // ============================================
  // CATEGORIES ET SOUS-CATEGORIES
  // ============================================
  const filtration = await prisma.categorie.upsert({
    where: { nom: "Filtration" },
    update: {},
    create: { nom: "Filtration", description: "Filtres à huile, air, essence", icone: "filter", ordre: 1 },
  });

  const freinage = await prisma.categorie.upsert({
    where: { nom: "Freinage" },
    update: {},
    create: { nom: "Freinage", description: "Plaquettes, disques, durites", icone: "disc", ordre: 2 },
  });

  const transmission = await prisma.categorie.upsert({
    where: { nom: "Transmission" },
    update: {},
    create: { nom: "Transmission", description: "Chaînes, pignons, couronnes", icone: "link", ordre: 3 },
  });

  const electrique = await prisma.categorie.upsert({
    where: { nom: "Électrique" },
    update: {},
    create: { nom: "Électrique", description: "Batteries, ampoules, relais", icone: "zap", ordre: 4 },
  });

  const moteur = await prisma.categorie.upsert({
    where: { nom: "Moteur" },
    update: {},
    create: { nom: "Moteur", description: "Bougies, joints, segments", icone: "cog", ordre: 5 },
  });

  console.log("Created 5 categories");

  // Sous-catégories
  await Promise.all([
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: filtration.id, nom: "Filtres à huile" } },
      update: {},
      create: { nom: "Filtres à huile", categorieId: filtration.id, ordre: 1 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: filtration.id, nom: "Filtres à air" } },
      update: {},
      create: { nom: "Filtres à air", categorieId: filtration.id, ordre: 2 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: filtration.id, nom: "Filtres à essence" } },
      update: {},
      create: { nom: "Filtres à essence", categorieId: filtration.id, ordre: 3 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: freinage.id, nom: "Plaquettes avant" } },
      update: {},
      create: { nom: "Plaquettes avant", categorieId: freinage.id, ordre: 1 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: freinage.id, nom: "Plaquettes arrière" } },
      update: {},
      create: { nom: "Plaquettes arrière", categorieId: freinage.id, ordre: 2 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: freinage.id, nom: "Disques" } },
      update: {},
      create: { nom: "Disques", categorieId: freinage.id, ordre: 3 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: transmission.id, nom: "Chaînes" } },
      update: {},
      create: { nom: "Chaînes", categorieId: transmission.id, ordre: 1 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: transmission.id, nom: "Pignons" } },
      update: {},
      create: { nom: "Pignons", categorieId: transmission.id, ordre: 2 },
    }),
    prisma.sousCategorie.upsert({
      where: { categorieId_nom: { categorieId: transmission.id, nom: "Couronnes" } },
      update: {},
      create: { nom: "Couronnes", categorieId: transmission.id, ordre: 3 },
    }),
  ]);
  console.log("Created sous-categories");

  // ============================================
  // MARQUES
  // ============================================
  const yamaha = await prisma.marque.upsert({
    where: { nom: "Yamaha" },
    update: {},
    create: { nom: "Yamaha", description: "Constructeur japonais", siteWeb: "https://www.yamaha-motor.fr" },
  });
  const honda = await prisma.marque.upsert({
    where: { nom: "Honda" },
    update: {},
    create: { nom: "Honda", description: "Constructeur japonais", siteWeb: "https://www.honda.fr" },
  });
  const kawasaki = await prisma.marque.upsert({
    where: { nom: "Kawasaki" },
    update: {},
    create: { nom: "Kawasaki", description: "Constructeur japonais", siteWeb: "https://www.kawasaki.fr" },
  });
  const suzuki = await prisma.marque.upsert({
    where: { nom: "Suzuki" },
    update: {},
    create: { nom: "Suzuki", description: "Constructeur japonais", siteWeb: "https://www.suzuki-moto.com" },
  });
  const did = await prisma.marque.upsert({
    where: { nom: "DID" },
    update: {},
    create: { nom: "DID", description: "Fabricant de chaînes" },
  });
  const ngk = await prisma.marque.upsert({
    where: { nom: "NGK" },
    update: {},
    create: { nom: "NGK", description: "Fabricant de bougies" },
  });
  const brembo = await prisma.marque.upsert({
    where: { nom: "Brembo" },
    update: {},
    create: { nom: "Brembo", description: "Fabricant de systèmes de freinage" },
  });
  console.log("Created 7 marques");

  // ============================================
  // MODELES DE VEHICULES
  // ============================================
  const mt07 = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: yamaha.id, nom: "MT-07", anneeDebut: 2018 } },
    update: {},
    create: { nom: "MT-07", marqueId: yamaha.id, anneeDebut: 2018, anneeFin: null, cylindree: 689, type: TypeVehicule.MOTO },
  });
  const xsr700 = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: yamaha.id, nom: "XSR700", anneeDebut: 2016 } },
    update: {},
    create: { nom: "XSR700", marqueId: yamaha.id, anneeDebut: 2016, anneeFin: null, cylindree: 689, type: TypeVehicule.MOTO },
  });
  const yzfR1 = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: yamaha.id, nom: "YZF-R1", anneeDebut: 2015 } },
    update: {},
    create: { nom: "YZF-R1", marqueId: yamaha.id, anneeDebut: 2015, anneeFin: null, cylindree: 998, type: TypeVehicule.MOTO },
  });
  const cbr600rr = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: honda.id, nom: "CBR600RR", anneeDebut: 2007 } },
    update: {},
    create: { nom: "CBR600RR", marqueId: honda.id, anneeDebut: 2007, anneeFin: 2017, cylindree: 599, type: TypeVehicule.MOTO },
  });
  const cbr600f = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: honda.id, nom: "CBR600F", anneeDebut: 2011 } },
    update: {},
    create: { nom: "CBR600F", marqueId: honda.id, anneeDebut: 2011, anneeFin: 2013, cylindree: 599, type: TypeVehicule.MOTO },
  });
  const z900 = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: kawasaki.id, nom: "Z900", anneeDebut: 2017 } },
    update: {},
    create: { nom: "Z900", marqueId: kawasaki.id, anneeDebut: 2017, anneeFin: null, cylindree: 948, type: TypeVehicule.MOTO },
  });
  const gsxr750 = await prisma.modeleVehicule.upsert({
    where: { marqueId_nom_anneeDebut: { marqueId: suzuki.id, nom: "GSX-R750", anneeDebut: 2011 } },
    update: {},
    create: { nom: "GSX-R750", marqueId: suzuki.id, anneeDebut: 2011, anneeFin: null, cylindree: 750, type: TypeVehicule.MOTO },
  });
  console.log("Created 7 modeles vehicules");

  // ============================================
  // FOURNISSEURS
  // ============================================
  const fournisseur1 = await prisma.fournisseur.upsert({
    where: { code: "MPD001" },
    update: {},
    create: {
      code: "MPD001",
      nom: "Moto Parts Direct",
      contact: "Jean Dupont",
      email: "contact@motoparts.fr",
      telephone: "01 23 45 67 89",
      adresse: "123 Avenue des Motos",
      ville: "Paris",
      codePostal: "75001",
      delaiLivraison: 3,
      conditions: "Paiement à 30 jours",
    },
  });
  const fournisseur2 = await prisma.fournisseur.upsert({
    where: { code: "SPR002" },
    update: {},
    create: {
      code: "SPR002",
      nom: "Speed Racing",
      contact: "Marie Martin",
      email: "info@speedracing.fr",
      telephone: "01 98 76 54 32",
      adresse: "45 Rue du Circuit",
      ville: "Lyon",
      codePostal: "69001",
      delaiLivraison: 5,
      conditions: "Paiement comptant",
    },
  });
  const fournisseur3 = await prisma.fournisseur.upsert({
    where: { code: "BKC003" },
    update: {},
    create: {
      code: "BKC003",
      nom: "Bike Components",
      contact: "Paul Bernard",
      email: "sales@bikecomp.fr",
      telephone: "02 34 56 78 90",
      adresse: "78 Boulevard des Sports",
      ville: "Marseille",
      codePostal: "13001",
      delaiLivraison: 7,
      conditions: "Paiement à 60 jours",
    },
  });
  console.log("Created 3 fournisseurs");

  // ============================================
  // PIECES
  // ============================================
  const emplA1B3 = emplacements.find((e) => e.code === "A1-B3");
  const emplA2B1 = emplacements.find((e) => e.code === "A2-B1");
  const emplB2C1 = emplacements.find((e) => e.code === "B2-C1");
  const emplC3D1 = emplacements.find((e) => e.code === "C3-D1");

  const piece1 = await prisma.piece.upsert({
    where: { reference: "FO-MT07-001" },
    update: {},
    create: {
      reference: "FO-MT07-001",
      codeBarres: "3760123456001",
      nom: "Filtre à huile Yamaha MT-07",
      description: "Filtre à huile d'origine pour Yamaha MT-07",
      prixVente: 12.5,
      prixAchat: 8.0,
      tauxTVA: 0,
      stock: 15,
      stockMin: 5,
      stockMax: 30,
      poids: 0.15,
      marqueId: yamaha.id,
      categorieId: filtration.id,
      fournisseurId: fournisseur1.id,
      emplacementId: emplA1B3?.id,
    },
  });

  const piece2 = await prisma.piece.upsert({
    where: { reference: "PF-CBR600-023" },
    update: {},
    create: {
      reference: "PF-CBR600-023",
      codeBarres: "3760123456002",
      nom: "Plaquettes de frein Honda CBR600",
      description: "Plaquettes de frein avant haute performance",
      prixVente: 45.9,
      prixAchat: 30.0,
      tauxTVA: 0,
      stock: 8,
      stockMin: 3,
      stockMax: 20,
      poids: 0.25,
      marqueId: honda.id,
      categorieId: freinage.id,
      fournisseurId: fournisseur2.id,
      emplacementId: emplB2C1?.id,
    },
  });

  const piece3 = await prisma.piece.upsert({
    where: { reference: "CH-DID520-120" },
    update: {},
    create: {
      reference: "CH-DID520-120",
      codeBarres: "3760123456003",
      nom: "Chaîne DID 520 - 120 maillons",
      description: "Chaîne de transmission renforcée",
      prixVente: 89.0,
      prixAchat: 60.0,
      tauxTVA: 0,
      stock: 6,
      stockMin: 2,
      stockMax: 15,
      poids: 1.5,
      dimensions: "520x120",
      marqueId: did.id,
      categorieId: transmission.id,
      fournisseurId: fournisseur3.id,
      emplacementId: emplC3D1?.id,
    },
  });

  const piece4 = await prisma.piece.upsert({
    where: { reference: "FA-YZF-R1-002" },
    update: {},
    create: {
      reference: "FA-YZF-R1-002",
      codeBarres: "3760123456004",
      nom: "Filtre à air Yamaha YZF-R1",
      description: "Filtre à air haute performance",
      prixVente: 35.0,
      prixAchat: 22.0,
      tauxTVA: 0,
      stock: 2,
      stockMin: 3,
      stockMax: 10,
      poids: 0.3,
      marqueId: yamaha.id,
      categorieId: filtration.id,
      fournisseurId: fournisseur1.id,
      emplacementId: emplA2B1?.id,
    },
  });

  const piece5 = await prisma.piece.upsert({
    where: { reference: "BR-BREMBO-P4" },
    update: {},
    create: {
      reference: "BR-BREMBO-P4",
      codeBarres: "3760123456005",
      nom: "Plaquettes Brembo P4",
      description: "Plaquettes de frein Brembo haute performance",
      prixVente: 75.0,
      prixAchat: 50.0,
      tauxTVA: 0,
      stock: 12,
      stockMin: 4,
      stockMax: 25,
      poids: 0.28,
      enPromotion: true,
      prixPromo: 65.0,
      marqueId: brembo.id,
      categorieId: freinage.id,
      fournisseurId: fournisseur2.id,
      emplacementId: emplB2C1?.id,
    },
  });

  console.log("Created 5 pieces");

  // ============================================
  // COMPATIBILITES PIECES-MODELES
  // ============================================
  await Promise.all([
    // Filtre huile MT-07 compatible avec MT-07 et XSR700
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece1.id, modeleId: mt07.id } },
      update: {},
      create: { pieceId: piece1.id, modeleId: mt07.id, notes: "Filtre OEM" },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece1.id, modeleId: xsr700.id } },
      update: {},
      create: { pieceId: piece1.id, modeleId: xsr700.id, notes: "Même moteur que MT-07" },
    }),
    // Plaquettes Honda compatible avec CBR600RR et CBR600F
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece2.id, modeleId: cbr600rr.id } },
      update: {},
      create: { pieceId: piece2.id, modeleId: cbr600rr.id },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece2.id, modeleId: cbr600f.id } },
      update: {},
      create: { pieceId: piece2.id, modeleId: cbr600f.id },
    }),
    // Chaîne universelle - compatible avec plusieurs modèles
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece3.id, modeleId: mt07.id } },
      update: {},
      create: { pieceId: piece3.id, modeleId: mt07.id, notes: "Taille 520" },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece3.id, modeleId: z900.id } },
      update: {},
      create: { pieceId: piece3.id, modeleId: z900.id, notes: "Taille 520" },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece3.id, modeleId: gsxr750.id } },
      update: {},
      create: { pieceId: piece3.id, modeleId: gsxr750.id, notes: "Taille 520" },
    }),
    // Filtre air R1
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece4.id, modeleId: yzfR1.id } },
      update: {},
      create: { pieceId: piece4.id, modeleId: yzfR1.id },
    }),
    // Plaquettes Brembo universelles
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece5.id, modeleId: yzfR1.id } },
      update: {},
      create: { pieceId: piece5.id, modeleId: yzfR1.id },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece5.id, modeleId: z900.id } },
      update: {},
      create: { pieceId: piece5.id, modeleId: z900.id },
    }),
    prisma.pieceModeleVehicule.upsert({
      where: { pieceId_modeleId: { pieceId: piece5.id, modeleId: gsxr750.id } },
      update: {},
      create: { pieceId: piece5.id, modeleId: gsxr750.id },
    }),
  ]);
  console.log("Created piece-modele compatibilities");

  // ============================================
  // PRIX FOURNISSEURS ALTERNATIFS
  // ============================================
  await Promise.all([
    // Le fournisseur 2 propose aussi le filtre huile
    prisma.pieceFournisseur.upsert({
      where: { pieceId_fournisseurId: { pieceId: piece1.id, fournisseurId: fournisseur2.id } },
      update: {},
      create: {
        pieceId: piece1.id,
        fournisseurId: fournisseur2.id,
        referenceFournisseur: "SPR-FO-001",
        prixAchat: 8.5,
        delaiLivraison: 5,
        quantiteMin: 5,
      },
    }),
    // Le fournisseur 3 propose aussi les plaquettes
    prisma.pieceFournisseur.upsert({
      where: { pieceId_fournisseurId: { pieceId: piece2.id, fournisseurId: fournisseur3.id } },
      update: {},
      create: {
        pieceId: piece2.id,
        fournisseurId: fournisseur3.id,
        referenceFournisseur: "BKC-PF-023",
        prixAchat: 32.0,
        delaiLivraison: 7,
        quantiteMin: 2,
      },
    }),
  ]);
  console.log("Created alternative supplier prices");

  // ============================================
  // CLIENTS
  // ============================================
  const client1 = await prisma.client.upsert({
    where: { code: "CLI001" },
    update: {},
    create: {
      code: "CLI001",
      type: "particulier",
      nom: "Dupont",
      prenom: "Jean",
      email: "jean.dupont@email.fr",
      telephone: "06 12 34 56 78",
      adresse: "123 Rue de la Moto",
      ville: "Paris",
      codePostal: "75001",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { code: "CLI002" },
    update: {},
    create: {
      code: "CLI002",
      type: "professionnel",
      nom: "Moto Garage",
      entreprise: "Moto Garage SARL",
      email: "contact@motogarage.fr",
      telephone: "01 23 45 67 89",
      telephoneMobile: "06 98 76 54 32",
      adresse: "45 Avenue des Mécaniciens",
      ville: "Lyon",
      codePostal: "69002",
      siret: "12345678901234",
      tva: "FR12345678901",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { code: "CLI003" },
    update: {},
    create: {
      code: "CLI003",
      type: "particulier",
      nom: "Bernard",
      prenom: "Sophie",
      email: "sophie.bernard@email.fr",
      telephone: "06 55 44 33 22",
      adresse: "78 Rue des Pilotes",
      ville: "Marseille",
      codePostal: "13008",
    },
  });
  console.log("Created 3 clients");

  // ============================================
  // MOUVEMENTS DE STOCK
  // ============================================
  await Promise.all([
    prisma.mouvementStock.create({
      data: {
        type: "ENTREE",
        quantite: 20,
        quantiteAvant: 0,
        quantiteApres: 20,
        motif: "Stock initial",
        reference: "INIT-001",
        pieceId: piece1.id,
        userId: admin.id,
      },
    }),
    prisma.mouvementStock.create({
      data: {
        type: "SORTIE",
        quantite: 5,
        quantiteAvant: 20,
        quantiteApres: 15,
        motif: "Vente",
        reference: "FAC-2024-001",
        pieceId: piece1.id,
        userId: vendeur.id,
      },
    }),
    prisma.mouvementStock.create({
      data: {
        type: "ENTREE",
        quantite: 10,
        quantiteAvant: 0,
        quantiteApres: 10,
        motif: "Stock initial",
        reference: "INIT-001",
        pieceId: piece2.id,
        userId: admin.id,
      },
    }),
    prisma.mouvementStock.create({
      data: {
        type: "SORTIE",
        quantite: 2,
        quantiteAvant: 10,
        quantiteApres: 8,
        motif: "Vente",
        reference: "FAC-2024-002",
        pieceId: piece2.id,
        userId: vendeur.id,
      },
    }),
  ]);
  console.log("Created stock movements");

  // ============================================
  // HISTORIQUE DES PRIX
  // ============================================
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  await Promise.all([
    prisma.historiquePrix.create({
      data: {
        pieceId: piece1.id,
        prixVente: 11.5,
        prixAchat: 7.5,
        dateChangement: oneMonthAgo,
        motif: "Prix initial",
      },
    }),
    prisma.historiquePrix.create({
      data: {
        pieceId: piece1.id,
        prixVente: 12.5,
        prixAchat: 8.0,
        dateChangement: new Date(),
        motif: "Augmentation fournisseur",
      },
    }),
  ]);
  console.log("Created price history");

  console.log("\n========================================");
  console.log("Seeding completed successfully!");
  console.log("========================================\n");
  console.log("Credentials:");
  console.log("  Admin:   admin@example.com / admin123");
  console.log("  Vendeur: vendeur@example.com / vendeur123");
  console.log("  Lecteur: lecteur@example.com / lecteur123");
  console.log("\n");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
