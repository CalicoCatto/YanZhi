"""搜狗微信公众号文章抓取器"""
import hashlib
import random
import time
from datetime import datetime
from typing import Optional
import requests
from bs4 import BeautifulSoup


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/120.0",
]

SOGOU_SEARCH_URL = "https://weixin.sogou.com/weixin"


class WeChatCrawler:
    def __init__(self):
        self.session = requests.Session()

    def _get_headers(self) -> dict:
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://weixin.sogou.com/",
        }

    def _make_content_hash(self, url: str, title: str) -> str:
        raw = f"{url}::{title}"
        return hashlib.md5(raw.encode()).hexdigest()

    def fetch_articles(self, account_name: str, max_articles: int = 5) -> list[dict]:
        """通过搜狗微信搜索抓取指定公众号的最新文章"""
        params = {
            "type": "1",
            "query": account_name,
            "ie": "utf8",
        }
        try:
            time.sleep(random.uniform(1.5, 3.5))
            resp = self.session.get(
                SOGOU_SEARCH_URL,
                params=params,
                headers=self._get_headers(),
                timeout=15,
            )
            resp.raise_for_status()
            return self._parse_search_results(resp.text, account_name, max_articles)
        except Exception as e:
            print(f"[WeChatCrawler] 抓取 {account_name} 失败: {e}")
            return []

    def _parse_search_results(self, html: str, account_name: str, max_articles: int) -> list[dict]:
        soup = BeautifulSoup(html, "lxml")
        articles = []

        # 搜狗微信搜索结果结构
        items = soup.select(".news-box .news-list li")
        for item in items[:max_articles]:
            try:
                title_el = item.select_one("h3 a") or item.select_one(".txt-box h3 a")
                if not title_el:
                    continue

                title = title_el.get_text(strip=True)
                url = title_el.get("href", "")
                if not url or not title:
                    continue

                summary_el = item.select_one("p.txt-info") or item.select_one(".txt-box p")
                summary = summary_el.get_text(strip=True) if summary_el else ""

                # 发布时间
                time_el = item.select_one(".s-p") or item.select_one("label.s-p")
                published_str = time_el.get_text(strip=True) if time_el else ""
                published_at = self._parse_time(published_str)

                # 封面图
                img_el = item.select_one("img")
                cover_image = img_el.get("src") or img_el.get("data-src") if img_el else None

                # 来源账号名
                account_el = item.select_one(".s-p span") or item.select_one(".account")
                author = account_el.get_text(strip=True) if account_el else account_name

                content_hash = self._make_content_hash(url, title)

                articles.append({
                    "title": title,
                    "summary": summary,
                    "content": "",
                    "original_url": url,
                    "cover_image": cover_image,
                    "author": author,
                    "published_at": published_at,
                    "content_hash": content_hash,
                })
            except Exception as e:
                print(f"[WeChatCrawler] 解析条目出错: {e}")
                continue

        return articles

    def _parse_time(self, time_str: str) -> datetime:
        """尽力解析时间字符串，失败则返回当前时间"""
        import re
        now = datetime.now()
        if not time_str:
            return now

        # "X天前" 格式
        m = re.search(r"(\d+)天前", time_str)
        if m:
            from datetime import timedelta
            return now - timedelta(days=int(m.group(1)))

        # "X小时前" 格式
        m = re.search(r"(\d+)小时前", time_str)
        if m:
            from datetime import timedelta
            return now - timedelta(hours=int(m.group(1)))

        # "昨天"
        if "昨天" in time_str:
            from datetime import timedelta
            return now - timedelta(days=1)

        # "MM-DD" 或 "YYYY-MM-DD"
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", time_str)
        if m:
            try:
                return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except Exception:
                pass

        m = re.search(r"(\d{2})-(\d{2})", time_str)
        if m:
            try:
                return datetime(now.year, int(m.group(1)), int(m.group(2)))
            except Exception:
                pass

        return now
