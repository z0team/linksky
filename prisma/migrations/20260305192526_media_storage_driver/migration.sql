-- AlterTable
ALTER TABLE "public"."media" ADD COLUMN     "public_url" TEXT,
ADD COLUMN     "storage_key" TEXT,
ADD COLUMN     "storage_provider" TEXT NOT NULL DEFAULT 'db',
ALTER COLUMN "data" DROP NOT NULL;
