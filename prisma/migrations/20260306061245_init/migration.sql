-- CreateTable
CREATE TABLE "sources" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platform_category" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "original_url" TEXT NOT NULL,
    "cover_image" TEXT,
    "author" TEXT NOT NULL DEFAULT '',
    "published_at" DATETIME NOT NULL,
    "crawled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_category" TEXT NOT NULL DEFAULT '其他',
    "ai_subcategory" TEXT NOT NULL DEFAULT '',
    "ai_tags" TEXT NOT NULL DEFAULT '[]',
    "ai_importance" INTEGER NOT NULL DEFAULT 3,
    "ai_analysis_level" INTEGER NOT NULL DEFAULT 0,
    "ai_brief" TEXT NOT NULL DEFAULT '',
    "event_time" TEXT,
    "event_location" TEXT,
    "event_registration" TEXT,
    "content_hash" TEXT NOT NULL,
    CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "crawl_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "articles_found" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    CONSTRAINT "crawl_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "parent_slug" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_content_hash_key" ON "articles"("content_hash");

-- CreateIndex
CREATE INDEX "articles_ai_category_idx" ON "articles"("ai_category");

-- CreateIndex
CREATE INDEX "articles_source_id_idx" ON "articles"("source_id");

-- CreateIndex
CREATE INDEX "articles_published_at_idx" ON "articles"("published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_ai_category_published_at_idx" ON "articles"("ai_category", "published_at" DESC);

-- CreateIndex
CREATE INDEX "crawl_logs_source_id_idx" ON "crawl_logs"("source_id");

-- CreateIndex
CREATE INDEX "crawl_logs_started_at_idx" ON "crawl_logs"("started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
