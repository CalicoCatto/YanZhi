"""燕知爬虫主程序 — APScheduler 定时调度"""
import sys
import os
import json
import sqlite3
import argparse
import random
import time
from datetime import datetime
from pathlib import Path

import yaml
from dotenv import load_dotenv
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

# 加载环境变量（从项目根目录）
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

from sources.wechat import WeChatCrawler
from sources.website import WebsiteCrawler
from ai.client import SiliconFlowClient
from ai.classifier import ArticleClassifier


# 数据库连接（直接用 sqlite3，不依赖 Prisma JS）
DB_PATH = ROOT_DIR / "prisma" / "dev.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_sources() -> list[dict]:
    sources_file = Path(__file__).parent / "sources.yaml"
    with open(sources_file, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return [s for s in data.get("sources", []) if s.get("enabled", True)]


def sync_sources_to_db(sources: list[dict]):
    """将 sources.yaml 中的数据源同步到数据库"""
    conn = get_db()
    cursor = conn.cursor()
    for s in sources:
        cursor.execute(
            """
            INSERT INTO sources (name, type, platform_category, identifier, config, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, '{}', 1, datetime('now'), datetime('now'))
            ON CONFLICT DO NOTHING
            """,
            (s["name"], s["type"], s["platform_category"], s["identifier"]),
        )
    conn.commit()
    conn.close()


def get_source_id(name: str) -> int | None:
    conn = get_db()
    row = conn.execute("SELECT id FROM sources WHERE name = ?", (name,)).fetchone()
    conn.close()
    return row["id"] if row else None


def article_exists(content_hash: str) -> bool:
    conn = get_db()
    row = conn.execute(
        "SELECT id FROM articles WHERE content_hash = ?", (content_hash,)
    ).fetchone()
    conn.close()
    return row is not None


def save_article(source_id: int, article: dict, ai_result: dict):
    conn = get_db()
    conn.execute(
        """
        INSERT OR IGNORE INTO articles (
            source_id, title, summary, content, original_url, cover_image, author,
            published_at, crawled_at,
            ai_category, ai_subcategory, ai_tags, ai_importance, ai_analysis_level, ai_brief,
            event_time, event_location, event_registration, content_hash
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, datetime('now'),
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        """,
        (
            source_id,
            article["title"],
            article.get("summary", ""),
            article.get("content", ""),
            article["original_url"],
            article.get("cover_image"),
            article.get("author", ""),
            article["published_at"].isoformat() if isinstance(article["published_at"], datetime) else article["published_at"],
            ai_result["category"],
            ai_result["subcategory"],
            json.dumps(ai_result["tags"], ensure_ascii=False),
            ai_result["importance"],
            ai_result["analysis_level"],
            ai_result["ai_brief"],
            ai_result.get("event_time"),
            ai_result.get("event_location"),
            ai_result.get("event_registration"),
            article["content_hash"],
        ),
    )
    conn.commit()
    conn.close()


def log_crawl(source_id: int, status: str, articles_found: int, error: str = None):
    conn = get_db()
    conn.execute(
        """
        INSERT INTO crawl_logs (source_id, status, articles_found, error_message, started_at, finished_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        (source_id, status, articles_found, error),
    )
    conn.commit()
    conn.close()


def crawl_wechat_source(source: dict, crawler: WeChatCrawler, classifier: ArticleClassifier) -> int:
    source_id = get_source_id(source["name"])
    if not source_id:
        print(f"[main] 数据源未找到: {source['name']}")
        return 0

    print(f"[main] 抓取: {source['name']}")
    articles = crawler.fetch_articles(source["identifier"])
    new_count = 0

    for article in articles:
        if article_exists(article["content_hash"]):
            continue
        try:
            ai_result = classifier.classify(
                title=article["title"],
                summary=article.get("summary", ""),
                content=article.get("content", ""),
            )
            save_article(source_id, article, ai_result)
            new_count += 1
            time.sleep(random.uniform(0.5, 1.5))
        except Exception as e:
            print(f"[main] 分析/保存文章出错: {e}")

    log_crawl(source_id, "success", new_count)
    print(f"[main] {source['name']} — 新增 {new_count} 篇")
    return new_count


def crawl_all_sources():
    now = datetime.now()
    print(f"\n[{now.strftime('%Y-%m-%d %H:%M')}] 开始全量抓取...")

    sources = load_sources()
    sync_sources_to_db(sources)

    sfc = SiliconFlowClient()
    classifier = ArticleClassifier(sfc)
    wechat_crawler = WeChatCrawler()

    total_new = 0
    for source in sources:
        try:
            if source["type"] == "wechat":
                total_new += crawl_wechat_source(source, wechat_crawler, classifier)
            # website 类型暂不启用
            time.sleep(random.uniform(2, 5))
        except Exception as e:
            print(f"[main] 处理 {source['name']} 时出错: {e}")
            source_id = get_source_id(source["name"])
            if source_id:
                log_crawl(source_id, "error", 0, str(e))

    sfc.close()
    print(f"[main] 抓取完成，共新增 {total_new} 篇文章\n")


def run_scheduler():
    scheduler = BlockingScheduler(timezone="Asia/Shanghai")
    # 每小时整点执行，1:00-6:59 休眠
    scheduler.add_job(
        crawl_all_sources,
        CronTrigger(hour="0,7-23", minute=0, timezone="Asia/Shanghai"),
        id="hourly_crawl",
        max_instances=1,
        misfire_grace_time=300,
    )
    print("[main] 调度器启动，每小时整点抓取（1:00-6:59 休眠）")
    scheduler.start()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="燕知爬虫")
    parser.add_argument("--test", action="store_true", help="立即执行一次抓取（测试用）")
    args = parser.parse_args()

    if args.test:
        crawl_all_sources()
    else:
        run_scheduler()
