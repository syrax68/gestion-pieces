/**
 * Script d'import local → Neon (production)
 *
 * CONTEXTE : Les ports TCP 5432 et 6432 sont bloqués sur le réseau local,
 * donc on ne peut pas se connecter à Neon via Prisma/pg classique.
 * Ce script utilise le driver HTTP de @neondatabase/serverless (port 443).
 *
 * PRÉREQUIS :
 *   pnpm add -D @neondatabase/serverless   (dans packages/backend)
 *
 * UTILISATION :
 *   cd packages/backend
 *   NEON_URL="postgresql://neondb_owner:<password>@<host>/neondb?sslmode=require" \
 *   npx tsx prisma/migrations-scripts/import-to-neon.ts
 *
 * VARIABLES D'ENV :
 *   NEON_URL   — URL de connexion Neon (sans pgbouncer=true, sans channel_binding)
 *                Exemple: postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require
 *   LOCAL_DB   — (optionnel) DATABASE_URL local si différent du .env
 *                Par défaut utilise le DATABASE_URL du .env
 *
 * CE QUI EST IMPORTÉ (dans l'ordre pour respecter les FK) :
 *   1. Boutiques
 *   2. Users
 *   3. Catégories + SousCategories
 *   4. Marques
 *   5. Fournisseurs
 *   6. Clients
 *   7. Pièces
 *   8. Mouvements de stock
 *   9. Factures + FactureItems
 *  10. Achats + AchatItems
 *  11. Devis + DevisItems
 *  12. Avoirs + AvoirItems
 *  13. Inventaires + InventaireItems
 *  14. ActivityLogs
 *
 * NOTE IMPORTANTE : sql.unsafe() ne fonctionne PAS avec @neondatabase/serverless
 * (retourne un objet sans exécuter). Utiliser sql.query(string) à la place.
 */

import { neon } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

// ─── Configuration ────────────────────────────────────────────────────────────

const NEON_URL = process.env.NEON_URL;
if (!NEON_URL) {
  console.error("❌ NEON_URL manquant. Exemple :");
  console.error(
    '   NEON_URL="postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require" npx tsx prisma/migrations-scripts/import-to-neon.ts'
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const sql = neon(NEON_URL);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  // Escape les apostrophes pour éviter les injections SQL
  return `'${String(val).replace(/'/g, "''")}'`;
}

function row(obj: Record<string, unknown>): string {
  return `(${Object.values(obj).map(escape).join(", ")})`;
}

async function runSQL(statement: string): Promise<void> {
  try {
    // IMPORTANT: utiliser sql.query() et NON sql.unsafe()
    // sql.unsafe() retourne juste un objet sans exécuter la requête
    await sql.query(statement);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Ignorer les erreurs de duplicates (si on relance le script)
    if (message.includes("duplicate key") || message.includes("already exists")) {
      process.stdout.write(" (skip)");
    } else {
      throw err;
    }
  }
}

async function importTable<T extends Record<string, unknown>>(
  name: string,
  data: T[],
  columns: (keyof T)[]
): Promise<void> {
  if (data.length === 0) {
    console.log(`  ⏭  ${name}: vide, ignoré`);
    return;
  }
  console.log(`  → ${name}: ${data.length} enregistrements...`);

  const cols = columns.join(", ");
  const BATCH = 50; // Éviter les requêtes trop longues
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    const values = batch
      .map((item) => row(columns.reduce((acc, col) => ({ ...acc, [col]: item[col] }), {})))
      .join(",\n    ");
    const stmt = `INSERT INTO "${name}" (${cols}) VALUES\n    ${values}\n    ON CONFLICT DO NOTHING;`;
    await runSQL(stmt);
    process.stdout.write(`\r  → ${name}: ${Math.min(i + BATCH, data.length)}/${data.length}`);
  }
  console.log(` ✓`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Import local → Neon démarré\n");
  console.log(`   Neon: ${NEON_URL.replace(/:([^:@]+)@/, ":***@")}\n`);

  // Test connexion Neon
  try {
    const res = await sql.query("SELECT NOW() as now");
    console.log(`✅ Connexion Neon OK — ${res.rows[0].now}\n`);
  } catch (err) {
    console.error("❌ Impossible de se connecter à Neon:", err);
    process.exit(1);
  }

  // ── 1. Boutiques ────────────────────────────────────────────────────────────
  console.log("📦 Boutiques");
  const boutiques = await prisma.boutique.findMany();
  await importTable("Boutique", boutiques, [
    "id", "nom", "adresse", "ville", "telephone", "email",
    "logo", "siret", "actif", "createdAt", "updatedAt",
  ] as (keyof (typeof boutiques)[0])[]);

  // ── 2. Users ─────────────────────────────────────────────────────────────────
  console.log("👤 Users");
  const users = await prisma.user.findMany();
  await importTable("User", users, [
    "id", "email", "password", "nom", "prenom", "role",
    "actif", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof users)[0])[]);

  // ── 3. Catégories ────────────────────────────────────────────────────────────
  console.log("🗂  Catégories");
  const categories = await prisma.categorie.findMany();
  await importTable("Categorie", categories, [
    "id", "nom", "description", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof categories)[0])[]);

  const sousCategories = await prisma.sousCategorie.findMany();
  await importTable("SousCategorie", sousCategories, [
    "id", "nom", "description", "categorieId", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof sousCategories)[0])[]);

  // ── 4. Marques ───────────────────────────────────────────────────────────────
  console.log("🏷  Marques");
  const marques = await prisma.marque.findMany();
  await importTable("Marque", marques, [
    "id", "nom", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof marques)[0])[]);

  // ── 5. Fournisseurs ──────────────────────────────────────────────────────────
  console.log("🏭 Fournisseurs");
  const fournisseurs = await prisma.fournisseur.findMany();
  await importTable("Fournisseur", fournisseurs, [
    "id", "nom", "contact", "telephone", "email", "adresse",
    "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof fournisseurs)[0])[]);

  // ── 6. Clients ───────────────────────────────────────────────────────────────
  console.log("👥 Clients");
  const clients = await prisma.client.findMany();
  await importTable("Client", clients, [
    "id", "nom", "prenom", "telephone", "email", "adresse",
    "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof clients)[0])[]);

  // ── 7. Pièces ────────────────────────────────────────────────────────────────
  console.log("🔩 Pièces");
  const pieces = await prisma.piece.findMany();
  await importTable("Piece", pieces, [
    "id", "reference", "nom", "description", "prixVente", "prixAchat",
    "quantiteStock", "quantiteMinimum", "emplacement",
    "categorieId", "sousCategorieId", "marqueId", "fournisseurId",
    "boutiqueId", "actif", "createdAt", "updatedAt",
  ] as (keyof (typeof pieces)[0])[]);

  // ── 8. Historique Prix ───────────────────────────────────────────────────────
  console.log("💰 Historique Prix");
  const historiquePrix = await prisma.historiquePrix.findMany();
  await importTable("HistoriquePrix", historiquePrix, [
    "id", "pieceId", "prixVente", "prixAchat", "motif",
    "userId", "boutiqueId", "createdAt",
  ] as (keyof (typeof historiquePrix)[0])[]);

  // ── 9. Mouvements Stock ──────────────────────────────────────────────────────
  console.log("📊 Mouvements Stock");
  const mouvements = await prisma.mouvementStock.findMany();
  await importTable("MouvementStock", mouvements, [
    "id", "pieceId", "type", "quantite", "quantiteAvant", "quantiteApres",
    "motif", "reference", "userId", "boutiqueId", "createdAt",
  ] as (keyof (typeof mouvements)[0])[]);

  // ── 10. Factures ─────────────────────────────────────────────────────────────
  console.log("🧾 Factures");
  const factures = await prisma.facture.findMany();
  await importTable("Facture", factures, [
    "id", "numero", "statut", "clientId", "createurId",
    "sousTotal", "remise", "total", "notes", "boutiqueId",
    "createdAt", "updatedAt",
  ] as (keyof (typeof factures)[0])[]);

  const factureItems = await prisma.factureItem.findMany();
  await importTable("FactureItem", factureItems, [
    "id", "factureId", "pieceId", "quantite", "prixUnitaire",
    "remise", "total", "createdAt",
  ] as (keyof (typeof factureItems)[0])[]);

  // ── 11. Achats ───────────────────────────────────────────────────────────────
  console.log("🛒 Achats");
  const achats = await prisma.achat.findMany();
  await importTable("Achat", achats, [
    "id", "numero", "statut", "fournisseurId", "createurId",
    "sousTotal", "total", "notes", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof achats)[0])[]);

  const achatItems = await prisma.achatItem.findMany();
  await importTable("AchatItem", achatItems, [
    "id", "achatId", "pieceId", "quantite", "prixUnitaire", "total", "createdAt",
  ] as (keyof (typeof achatItems)[0])[]);

  // ── 12. Devis ────────────────────────────────────────────────────────────────
  console.log("📝 Devis");
  const devis = await prisma.devis.findMany();
  await importTable("Devis", devis, [
    "id", "numero", "statut", "clientId", "createurId",
    "sousTotal", "remise", "total", "notes", "validiteJours",
    "dateExpiration", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof devis)[0])[]);

  const devisItems = await prisma.devisItem.findMany();
  await importTable("DevisItem", devisItems, [
    "id", "devisId", "pieceId", "quantite", "prixUnitaire",
    "remise", "total", "createdAt",
  ] as (keyof (typeof devisItems)[0])[]);

  // ── 13. Avoirs ───────────────────────────────────────────────────────────────
  console.log("↩️  Avoirs");
  const avoirs = await prisma.avoir.findMany();
  await importTable("Avoir", avoirs, [
    "id", "numero", "statut", "clientId", "factureId", "createurId",
    "total", "motif", "notes", "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof avoirs)[0])[]);

  const avoirItems = await prisma.avoirItem.findMany();
  await importTable("AvoirItem", avoirItems, [
    "id", "avoirId", "pieceId", "quantite", "prixUnitaire", "total", "createdAt",
  ] as (keyof (typeof avoirItems)[0])[]);

  // ── 14. Inventaires ──────────────────────────────────────────────────────────
  console.log("📋 Inventaires");
  const inventaires = await prisma.inventaire.findMany();
  await importTable("Inventaire", inventaires, [
    "id", "nom", "statut", "notes", "createurId",
    "boutiqueId", "createdAt", "updatedAt",
  ] as (keyof (typeof inventaires)[0])[]);

  const inventaireItems = await prisma.inventaireItem.findMany();
  await importTable("InventaireItem", inventaireItems, [
    "id", "inventaireId", "pieceId", "quantiteTheorique",
    "quantiteReelle", "ecart", "createdAt",
  ] as (keyof (typeof inventaireItems)[0])[]);

  // ── 15. Activity Logs ─────────────────────────────────────────────────────────
  console.log("📜 Activity Logs");
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: "asc" } });
  await importTable("ActivityLog", logs, [
    "id", "action", "entityType", "entityId", "description",
    "metadata", "userId", "boutiqueId", "createdAt",
  ] as (keyof (typeof logs)[0])[]);

  console.log("\n✅ Import terminé avec succès !");

  // Résumé
  const counts = {
    boutiques: boutiques.length,
    users: users.length,
    pieces: pieces.length,
    clients: clients.length,
    factures: factures.length,
    achats: achats.length,
    mouvements: mouvements.length,
  };
  console.log("\n📊 Résumé :");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   ${table}: ${count}`);
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Erreur:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
