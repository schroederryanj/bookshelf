-- AlterTable
ALTER TABLE "Book" ADD COLUMN "rating" INTEGER;

-- CreateIndex
CREATE INDEX "Book_rating_idx" ON "Book"("rating");
