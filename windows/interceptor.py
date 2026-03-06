"""
燕知 — Windows 端 mitmproxy 拦截器

用途：作为系统代理运行，拦截微信 PC 版 HTTPS 流量，
提取推送给当前账号的公众号文章，推送到阿里云服务器。

使用方法：
    pip install mitmproxy requests
    mitmdump -s interceptor.py --listen-port 8080

然后在 Windows 系统设置 → 代理 中设置：
    地址：127.0.0.1  端口：8080

首次运行后访问 http://mitm.it 安装 CA 证书（信任 mitmproxy 根证书）。
"""

import json
import os
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path

import requests
from mitmproxy import http

# ── 配置 ────────────────────────────────────────────────────────────────────

# 服务器 ingest 端点（改为你的实际域名或 IP）
SERVER_URL = os.environ.get("YANZHI_SERVER_URL", "http://localhost:3000/api/ingest")

# 与 .env 中 INGEST_SECRET 保持一致
INGEST_SECRET = os.environ.get("INGEST_SECRET", "yanzhi-local-secret")

# 本地去重缓存文件
SENT_CACHE_FILE = Path(__file__).parent / ".sent_urls.json"

# ── 日志 ────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s [interceptor] %(message)s")
log = logging.getLogger("interceptor")

# ── 已发送 URL 缓存 ──────────────────────────────────────────────────────────

def _load_cache() -> set:
    if SENT_CACHE_FILE.exists():
        try:
            return set(json.loads(SENT_CACHE_FILE.read_text(encoding="utf-8")))
        except Exception:
            pass
    return set()

def _save_cache(cache: set) -> None:
    try:
        SENT_CACHE_FILE.write_text(
            json.dumps(list(cache), ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        log.warning(f"无法保存缓存: {e}")

_sent_cache: set = _load_cache()

# ── 文章字段提取 ─────────────────────────────────────────────────────────────

def _extract_articles(data) -> list[dict]:
    """
    递归遍历 JSON 数据，寻找包含文章特征字段的对象。
    微信 API 响应中，文章通常在 app_msg_ext_info 或 content_url 字段附近。
    """
    articles = []
    _walk(data, articles)
    return articles


def _walk(node, out: list) -> None:
    if isinstance(node, dict):
        # 判断是否是文章对象：必须同时含有 content_url 和 title
        url = node.get("content_url") or node.get("url") or ""
        title = node.get("title") or ""
        if "mp.weixin.qq.com/s" in url and title:
            out.append({
                "title": title,
                "original_url": url,
                "summary": node.get("digest") or "",
                "cover_image": node.get("cover") or node.get("thumb_url") or None,
                "author": (
                    node.get("source_username")
                    or node.get("nickname")
                    or node.get("account_name")
                    or ""
                ),
                "published_at": _parse_ts(node.get("datetime") or node.get("create_time")),
                "content": "",  # 文章正文需额外请求，此处留空
            })
        else:
            for v in node.values():
                _walk(v, out)
    elif isinstance(node, list):
        for item in node:
            _walk(item, out)


def _parse_ts(ts) -> str:
    """将时间戳（int 或 str）转为 ISO 8601 字符串，失败则用当前时间。"""
    try:
        if ts:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
    except Exception:
        pass
    return datetime.now(tz=timezone.utc).isoformat()


# ── 推送到服务器 ─────────────────────────────────────────────────────────────

def _push(articles: list[dict]) -> None:
    new_articles = []
    for a in articles:
        key = hashlib.md5((a["original_url"] + a["title"]).encode()).hexdigest()
        if key not in _sent_cache:
            new_articles.append(a)
            _sent_cache.add(key)

    if not new_articles:
        return

    try:
        resp = requests.post(
            SERVER_URL,
            json={"articles": new_articles},
            headers={"Authorization": f"Bearer {INGEST_SECRET}"},
            timeout=15,
        )
        if resp.ok:
            data = resp.json()
            log.info(
                f"推送 {len(new_articles)} 篇文章 → 服务器接收 {data.get('received')}, "
                f"入库 {data.get('saved')}, 跳过 {data.get('skipped')}"
            )
        else:
            log.warning(f"服务器返回错误: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        log.error(f"推送失败: {e}")
    finally:
        _save_cache(_sent_cache)


# ── mitmproxy Addon ──────────────────────────────────────────────────────────

class WeChatInterceptor:
    def response(self, flow: http.HTTPFlow) -> None:
        host = flow.request.pretty_host

        # 只处理微信相关域名
        if not ("weixin.qq.com" in host or "wx.qq.com" in host or "mp.weixin.qq.com" in host):
            return

        ct = flow.response.headers.get("content-type", "")
        if "json" not in ct and "javascript" not in ct:
            return

        try:
            body = flow.response.get_text(strict=False)
            if not body:
                return
            data = json.loads(body)
        except Exception:
            return

        articles = _extract_articles(data)
        if articles:
            log.info(f"从 {host} 捕获到 {len(articles)} 篇文章")
            for a in articles:
                log.info(f"  [{a['author']}] {a['title']}")
            _push(articles)


addons = [WeChatInterceptor()]
