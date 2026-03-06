"""两级AI分类器"""
import json
import time
from typing import Optional
from .client import SiliconFlowClient
from .prompts import build_level1_prompt, build_level2_prompt, CATEGORY_LIST


DEFAULT_RESULT = {
    "category": "其他",
    "subcategory": "其他",
    "tags": [],
    "importance": 3,
    "ai_brief": "",
    "event_time": None,
    "event_location": None,
    "event_registration": None,
    "analysis_level": 1,
}


def _parse_json(text: Optional[str]) -> Optional[dict]:
    if not text:
        return None
    text = text.strip()
    # 去掉可能的 markdown 代码块
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # 尝试找到 JSON 对象
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except Exception:
                pass
    return None


def _validate_result(data: dict) -> dict:
    result = DEFAULT_RESULT.copy()
    if data.get("category") in CATEGORY_LIST:
        result["category"] = data["category"]
    if data.get("subcategory"):
        result["subcategory"] = str(data["subcategory"])
    if isinstance(data.get("tags"), list):
        result["tags"] = [str(t) for t in data["tags"][:5]]
    if isinstance(data.get("importance"), (int, float)):
        result["importance"] = max(1, min(5, int(data["importance"])))
    if data.get("ai_brief"):
        result["ai_brief"] = str(data["ai_brief"])[:40]
    for field in ("event_time", "event_location", "event_registration"):
        val = data.get(field)
        if val and str(val).lower() not in ("null", "none", ""):
            result[field] = str(val)
    return result


class ArticleClassifier:
    CONFIDENCE_THRESHOLD = 0.8

    def __init__(self, client: SiliconFlowClient):
        self.client = client

    def classify(self, title: str, summary: str, content: str = "") -> dict:
        # 第一级：轻量分析
        messages = build_level1_prompt(title, summary)
        raw = self.client.light_chat(messages, max_tokens=300)
        parsed = _parse_json(raw)

        if parsed:
            confidence = float(parsed.get("confidence", 0))
            if confidence >= self.CONFIDENCE_THRESHOLD:
                result = _validate_result(parsed)
                result["analysis_level"] = 1
                return result

        # 第二级：深度分析
        time.sleep(1)  # 避免频率限制
        messages2 = build_level2_prompt(title, summary, content)
        raw2 = self.client.heavy_chat(messages2, max_tokens=512)
        parsed2 = _parse_json(raw2)

        if parsed2:
            result = _validate_result(parsed2)
            result["analysis_level"] = 2
            return result

        # 兜底
        result = DEFAULT_RESULT.copy()
        result["analysis_level"] = 1
        return result
