-- Add 2GIS and Instagram integration fields to venues
ALTER TABLE "venues" ADD COLUMN "two_gis_id" TEXT;
ALTER TABLE "venues" ADD COLUMN "two_gis_url" TEXT;
ALTER TABLE "venues" ADD COLUMN "instagram_handle" TEXT;

-- Add index on reviews source for efficient source-based queries
CREATE INDEX "reviews_venue_id_source_idx" ON "reviews"("venue_id", "source");
