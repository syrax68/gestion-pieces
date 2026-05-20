CREATE TABLE "VenteJournaliere" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "boutiqueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenteJournaliere_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenteJournaliere_boutiqueId_idx" ON "VenteJournaliere"("boutiqueId");
CREATE INDEX "VenteJournaliere_date_idx" ON "VenteJournaliere"("date");

ALTER TABLE "VenteJournaliere" ADD CONSTRAINT "VenteJournaliere_boutiqueId_fkey" FOREIGN KEY ("boutiqueId") REFERENCES "Boutique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
