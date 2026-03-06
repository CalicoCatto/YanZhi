"""燕知 AI 分类服务 — FastAPI，仅监听 127.0.0.1:8001（不对外暴露）"""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from pydantic import BaseModel
from ai.client import SiliconFlowClient
from ai.classifier import ArticleClassifier

app = FastAPI()

_sfc = SiliconFlowClient()
_classifier = ArticleClassifier(_sfc)


class ClassifyRequest(BaseModel):
    title: str
    summary: str = ""
    content: str = ""


@app.post("/classify")
def classify(req: ClassifyRequest):
    result = _classifier.classify(
        title=req.title,
        summary=req.summary,
        content=req.content,
    )
    return result


@app.get("/health")
def health():
    return {"ok": True}
