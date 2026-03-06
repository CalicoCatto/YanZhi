/*
  Warnings:

  - You are about to drop the `crawl_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `config` on the `sources` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "crawl_logs_started_at_idx";

-- DropIndex
DROP INDEX "crawl_logs_source_id_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "crawl_logs";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'wechat',
    "platform_category" TEXT NOT NULL DEFAULT 'wechat',
    "identifier" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_sources" ("created_at", "enabled", "id", "identifier", "name", "platform_category", "type", "updated_at") SELECT "created_at", "enabled", "id", "identifier", "name", "platform_category", "type", "updated_at" FROM "sources";
DROP TABLE "sources";
ALTER TABLE "new_sources" RENAME TO "sources";
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
