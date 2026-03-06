"""网站抓取器（预留接口）"""
from datetime import datetime


class WebsiteCrawler:
    """预留的网站抓取器，暂不启用"""

    def fetch_articles(self, url: str, config: dict) -> list[dict]:
        """
        抓取指定网站的文章列表。
        config 可包含：
          - selector: CSS 选择器
          - title_selector: 标题选择器
          - url_selector: 链接选择器
          - date_selector: 日期选择器
        """
        # TODO: 根据实际网站结构实现
        return []
