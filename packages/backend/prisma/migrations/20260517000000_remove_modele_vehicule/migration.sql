-- DropForeignKey
ALTER TABLE "PieceModeleVehicule" DROP CONSTRAINT IF EXISTS "PieceModeleVehicule_modeleId_fkey";

-- DropForeignKey
ALTER TABLE "PieceModeleVehicule" DROP CONSTRAINT IF EXISTS "PieceModeleVehicule_pieceId_fkey";

-- DropTable
DROP TABLE IF EXISTS "PieceModeleVehicule";

-- DropTable
DROP TABLE IF EXISTS "ModeleVehicule";

-- DropEnum
DROP TYPE IF EXISTS "TypeVehicule";
