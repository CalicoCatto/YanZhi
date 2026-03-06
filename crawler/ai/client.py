"""SiliconFlow API 客户端"""
import os
import json
import time
import httpx
from typing import Optional


class SiliconFlowClient:
    BASE_URL = "https://api.siliconflow.cn/v1"

    def __init__(self):
        self.api_key = os.getenv("SILICONFLOW_API_KEY", "")
        self.light_model = os.getenv("SILICONFLOW_LIGHT_MODEL", "Qwen/Qwen2.5-7B-Instruct")
        self.heavy_model = os.getenv("SILICONFLOW_HEAVY_MODEL", "deepseek-ai/DeepSeek-V3")
        self.client = httpx.Client(timeout=60)

    def chat(self, model: str, messages: list, max_tokens: int = 512) -> Optional[str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.1,
        }
        for attempt in range(3):
            try:
                resp = self.client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
            except Exception as e:
                if attempt == 2:
                    print(f"[SiliconFlow] 请求失败: {e}")
                    return None
                time.sleep(2 ** attempt)
        return None

    def light_chat(self, messages: list, max_tokens: int = 512) -> Optional[str]:
        return self.chat(self.light_model, messages, max_tokens)

    def heavy_chat(self, messages: list, max_tokens: int = 1024) -> Optional[str]:
        return self.chat(self.heavy_model, messages, max_tokens)

    def close(self):
        self.client.close()
