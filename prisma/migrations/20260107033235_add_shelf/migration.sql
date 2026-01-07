-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "img" TEXT NOT NULL,
    "height" REAL NOT NULL,
    "read" TEXT,
    "author" TEXT,
    "pages" INTEGER,
    "genre" TEXT,
    "description" TEXT,
    "shelf" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Book" ("author", "createdAt", "description", "genre", "height", "id", "img", "pages", "position", "read", "title", "updatedAt") SELECT "author", "createdAt", "description", "genre", "height", "id", "img", "pages", "position", "read", "title", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE INDEX "Book_title_idx" ON "Book"("title");
CREATE INDEX "Book_author_idx" ON "Book"("author");
CREATE INDEX "Book_read_idx" ON "Book"("read");
CREATE INDEX "Book_shelf_idx" ON "Book"("shelf");
CREATE INDEX "Book_position_idx" ON "Book"("position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
