"""调试脚本：检查搜狗微信抓取的实际返回内容"""
import sys
import requests
from bs4 import BeautifulSoup

SOGOU_URL = "https://weixin.sogou.com/weixin"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

account = sys.argv[1] if len(sys.argv) > 1 else "北京大学团委"

print(f"=== 查询: {account} ===\n")

resp = requests.get(
    SOGOU_URL,
    params={"type": "1", "query": account, "ie": "utf8"},
    headers={"User-Agent": UA, "Referer": "https://weixin.sogou.com/"},
    timeout=15,
)

print(f"HTTP 状态码: {resp.status_code}")
print(f"最终 URL: {resp.url}")
print(f"响应长度: {len(resp.text)} 字符\n")

soup = BeautifulSoup(resp.text, "lxml")

# 检查是否被拦截
title = soup.title.string if soup.title else "(无 title)"
print(f"页面 title: {title}\n")

if "验证" in title or "captcha" in title.lower() or "blocked" in title.lower():
    print("!! 检测到验证码/拦截页，搜狗已封锁此 IP")
    sys.exit(1)

# 打印页面前2000字符（定位结构）
print("--- 页面 HTML 前 2000 字符 ---")
print(resp.text[:2000])
print("...\n")

# 尝试各种可能的选择器
selectors = [
    ".news-box .news-list li",
    "ul.news-list > li",
    ".news-list li",
    "#sogou_main .news-box li",
    ".vrwrap",
    "div.wx-rb",
]
print("--- 选择器匹配结果 ---")
for sel in selectors:
    items = soup.select(sel)
    print(f"  {sel!r:45s} => {len(items)} 条")

print()

# 打印所有 class 含 "news" 或 "wx" 的元素
print("--- 含 news/wx class 的元素（前10个）---")
for el in soup.find_all(class_=lambda c: c and any(k in c for k in ["news", "wx", "item", "result"])):
    print(f"  <{el.name} class='{el.get('class')}'>")
    if len(el.get_text(strip=True)) < 100:
        print(f"    text: {el.get_text(strip=True)}")
    print()
    if _ := el.find_all.__name__:  # just a way to count
        pass

# 打印完整 HTML 到文件方便检查
with open("/tmp/sogou_debug.html", "w", encoding="utf-8") as f:
    f.write(resp.text)
print("完整 HTML 已保存到 /tmp/sogou_debug.html")
print("可用 grep 搜索：grep -i 'news-list\\|wx-rb\\|vrwrap' /tmp/sogou_debug.html | head -20")
