# 燕知 YanZhi — 项目构建方案 V2


## Context

北京大学校内信息分散在各官方网站、数十个院系公众号、上百个社团公众号中，学生获取信息成本高、信息差严重。本项目旨在构建一个**自动化信息聚合+AI分析平台**，定时抓取各渠道信息，通过AI智能分类后统一呈现，打破信息壁垒。

**核心约束：**
- 个人项目，面向北大校内师生
- 优先实现公众号数据抓取，网站数据预留接口
- 使用 SiliconFlow AI 服务（可选不同模型节点）
- 每小时自动抓取（1:00-7:00休眠），两级AI分析策略节省开销
- 部署目标：阿里云 ECS（2核/2GB/40GB/3Mbps）

---

## 1. 推荐技术栈

```
┌─────────────────────────────────────────────────┐
│                   前端 (Next.js)                 │
│  React 18 + TypeScript + Tailwind CSS + shadcn  │
│  SSR渲染 · 多维分类浏览 · 搜索 · 响应式设计      │
└──────────────────────┬──────────────────────────┘
                       │ API Routes
┌──────────────────────┴──────────────────────────┐
│               后端 (Next.js API Routes)          │
│  数据查询 · 分类筛选 · 搜索接口 · 管理接口        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│          数据采集服务 (Python 独立进程)            │
│  APScheduler定时调度 · 公众号爬虫 · 网站爬虫(预留) │
│  SiliconFlow AI分析 · 数据清洗入库               │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│                 数据库 (SQLite)                   │
│  文章存储 · 分类标签 · 抓取日志 · 数据源配置       │
└─────────────────────────────────────────────────┘
          ↑
┌─────────┴──────────┐
│   Nginx 反向代理    │  ← 静态资源缓存 + gzip
│   端口 80/443      │
└────────────────────┘
```

| 组件 | 选择 | 理由 |
|------|------|------|
| 前端框架 | **Next.js 14 (App Router)** | SSR利于首屏加载、API Routes免部署独立后端 |
| UI库 | **Tailwind CSS + shadcn/ui** | 快速构建密集信息界面 |
| 采集服务 | **Python + APScheduler** | 爬虫生态最强，cron调度灵活 |
| 数据库 | **SQLite** | 零配置、省内存，2G服务器最优选 |
| ORM | **Prisma (JS端) + SQLAlchemy (Python端)** | 共享同一SQLite文件 |
| AI服务 | **SiliconFlow API** | 支持多模型节点切换 |
| 进程管理 | **pm2** | 同时管理 Next.js 和 Python 进程 |
| Web服务器 | **Nginx** | 反向代理 + 静态缓存 + gzip |

---

## 2. 项目目录结构

```
pku-info-hub/
├── package.json
├── next.config.js
├── ecosystem.config.js            # pm2 配置(管理Next.js+Python)
├── nginx.conf                     # Nginx配置模板
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 全局布局
│   │   ├── page.tsx               # 首页(密集卡片信息流)
│   │   ├── platform/
│   │   │   └── [slug]/page.tsx    # 按平台分类浏览
│   │   ├── category/
│   │   │   └── [slug]/page.tsx    # 按内容分类浏览
│   │   ├── article/
│   │   │   └── [id]/page.tsx      # 文章详情页
│   │   ├── search/
│   │   │   └── page.tsx           # 搜索结果页
│   │   ├── admin/
│   │   │   ├── page.tsx           # 管理后台首页
│   │   │   ├── sources/page.tsx   # 数据源管理
│   │   │   └── crawl-log/page.tsx # 抓取日志
│   │   └── api/
│   │       ├── articles/route.ts
│   │       ├── categories/route.ts
│   │       └── admin/
│   │           ├── sources/route.ts
│   │           └── trigger-crawl/route.ts
│   │
│   ├── components/
│   │   ├── SourceCard.tsx         # 数据源小卡片(核心组件)
│   │   ├── ArticleItem.tsx        # 条目行(标题+AI摘要)
│   │   ├── CardGrid.tsx           # 卡片网格布局
│   │   ├── ViewToggle.tsx         # 切换: 按类型/按来源
│   │   ├── SearchBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   │
│   ├── lib/
│   │   ├── db.ts
│   │   └── utils.ts
│   │
│   └── types/
│       └── index.ts
│
├── crawler/
│   ├── requirements.txt
│   ├── main.py                    # 入口 + APScheduler
│   ├── models.py
│   ├── database.py
│   ├── sources/
│   │   ├── base.py
│   │   ├── wechat.py              # 公众号抓取器
│   │   └── website.py             # 网站抓取器(预留)
│   ├── ai/
│   │   ├── client.py              # SiliconFlow客户端
│   │   ├── classifier.py          # 两级分类器
│   │   └── prompts.py
│   └── utils/
│       ├── logger.py
│       └── dedup.py
│
├── data/
│   └── sources.yaml               # 完整抓取名单
│
└── deploy/
    ├── setup.sh                   # 一键初始化服务器脚本
    ├── nginx.conf                 # Nginx站点配置
    └── ecosystem.config.js        # pm2进程配置
```

---

## 3. 数据库设计

```sql
-- 数据源表
CREATE TABLE sources (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,           -- "北京大学餐饮中心官方咨询"
    type              TEXT NOT NULL,           -- "wechat" | "website"
    platform_category TEXT NOT NULL,           -- "official" | "semi_official" | "college" | "club"
    identifier        TEXT NOT NULL,           -- 公众号名称 或 网站URL
    config            TEXT,                    -- JSON: 额外配置
    enabled           BOOLEAN DEFAULT TRUE,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章表
CREATE TABLE articles (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id         INTEGER NOT NULL REFERENCES sources(id),
    title             TEXT NOT NULL,
    summary           TEXT,                    -- AI生成摘要
    content           TEXT,                    -- 文章正文
    original_url      TEXT,                    -- 原文链接
    cover_image       TEXT,                    -- 封面图URL
    author            TEXT,
    published_at      DATETIME,               -- 原文发布时间
    crawled_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- AI分类结果
    ai_category       TEXT,                    -- 主分类
    ai_subcategory    TEXT,                    -- 子分类
    ai_tags           TEXT,                    -- JSON数组
    ai_importance     INTEGER DEFAULT 0,       -- 1-5
    ai_analysis_level TEXT DEFAULT 'title',    -- title | full
    ai_brief          TEXT,                    -- 一句话AI摘要(显示在条目下方)

    -- 活动专用字段(AI提取)
    event_time        TEXT,                    -- 活动时间
    event_location    TEXT,                    -- 活动地点
    event_registration TEXT,                   -- 报名方式

    -- 去重
    content_hash      TEXT UNIQUE,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 抓取日志
CREATE TABLE crawl_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id         INTEGER REFERENCES sources(id),
    status            TEXT NOT NULL,           -- success | failed | no_update
    articles_found    INTEGER DEFAULT 0,
    error_message     TEXT,
    started_at        DATETIME,
    finished_at       DATETIME
);

-- 分类定义
CREATE TABLE categories (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    slug              TEXT UNIQUE NOT NULL,
    name              TEXT NOT NULL,
    icon              TEXT,
    parent_slug       TEXT,                    -- 父分类slug(子分类用)
    sort_order        INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX idx_articles_category ON articles(ai_category);
CREATE INDEX idx_articles_source ON articles(source_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_hash ON articles(content_hash);
CREATE INDEX idx_articles_recent ON articles(published_at DESC, ai_category);
```

---

## 4. 数据采集服务设计

### 4.1 调度策略

```python
# main.py
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BlockingScheduler()

# 每小时整点执行，1:00-6:59 休眠
scheduler.add_job(
    crawl_all_sources,
    CronTrigger(hour='0,7-23', minute=0),
    id='hourly_crawl',
    name='定时抓取所有数据源'
)
```

### 4.2 公众号抓取方案

**全量抓取，不做关键词筛选：**

```
抓取流程：
1. 遍历 sources.yaml 中所有启用的公众号
2. 通过搜狗微信搜索按公众号名称检索最新文章
3. 获取文章列表（标题、摘要、发布时间、链接）
4. 通过 content_hash 去重，筛选出数据库中不存在的新文章
5. 全部新文章进入AI两级分类流程
6. 结果入库，前端自动展示
```

**备选抓取渠道（按优先级）：**
1. **搜狗微信搜索** (weixin.sogou.com) — 主方案，无需授权
2. **第三方RSS服务** (WeRSS/feeddd) — 备选，更稳定但可能收费
3. **微信公众平台API** — 需管理员授权，适合自有号

### 4.3 网站抓取方案（预留接口）

```python
class WebsiteCrawler(BaseCrawler):
    async def fetch_list(self, url: str, selectors: dict) -> List[RawArticle]:
        raise NotImplementedError
    async def fetch_detail(self, url: str) -> ArticleDetail:
        raise NotImplementedError
```

---

## 5. AI分析服务设计

### 5.1 两级分析策略

```
新文章进入（全部推文，不筛选）
    │
    ▼
┌──────────────────────────────────┐
│  第一级：标题+摘要 快速分析        │  ← 轻量模型，成本低
│  输入：title + summary + source   │
│  模型：Qwen/Qwen2.5-7B-Instruct  │
│  输出：category + confidence +    │
│        ai_brief (一句话摘要)      │
└──────────────┬───────────────────┘
               │
          confidence > 0.8?
         ╱            ╲
       是              否
       │               │
       ▼               ▼
   直接入库    ┌─────────────────────────┐
               │ 第二级：抓取全文深度分析    │
               │ 输入：full content         │
               │ 模型：deepseek-ai/DeepSeek-V3│
               │ 输出：category + tags +    │
               │   ai_brief + event_info   │
               └───────────┬───────────────┘
                           │
                        入库
```

### 5.2 SiliconFlow API 集成

```python
class SiliconFlowClient:
    BASE_URL = "https://api.siliconflow.cn/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    async def chat(self, model: str, messages: list, temperature: float = 0.3):
        """POST /v1/chat/completions"""
        ...

class ArticleClassifier:
    LIGHT_MODEL = "Qwen/Qwen2.5-7B-Instruct"
    HEAVY_MODEL = "deepseek-ai/DeepSeek-V3"
    CONFIDENCE_THRESHOLD = 0.8
```

### 5.3 分类体系

```yaml
categories:
  activity:              # 活动类（学生最关注）
    name: "活动"
    icon: "🎯"
    subcategories:
      - { slug: lecture, name: "讲座" }
      - { slug: competition, name: "比赛/竞赛" }
      - { slug: recruitment, name: "招新/招聘" }
      - { slug: performance, name: "演出/展览" }
      - { slug: sports, name: "体育赛事" }
      - { slug: volunteer, name: "志愿服务" }
      - { slug: workshop, name: "工作坊/培训" }
      - { slug: social, name: "社交/联谊" }

  academic:              # 学术类
    name: "学术"
    icon: "📚"
    subcategories:
      - { slug: course, name: "课程相关" }
      - { slug: exam, name: "考试安排" }
      - { slug: research, name: "科研动态" }
      - { slug: scholarship, name: "奖学金" }

  official_news:         # 官方新闻
    name: "官方新闻"
    icon: "📢"
    subcategories:
      - { slug: appointment, name: "人事任免" }
      - { slug: policy, name: "政策通知" }
      - { slug: achievement, name: "成果荣誉" }

  party_building:        # 党建新闻
    name: "党建"
    icon: "🚩"
    subcategories:
      - { slug: study, name: "理论学习" }
      - { slug: party_event, name: "党建活动" }

  campus_life:           # 校园生活
    name: "校园生活"
    icon: "🏫"
    subcategories:
      - { slug: dining, name: "餐饮" }
      - { slug: facility, name: "设施/场馆" }
      - { slug: transport, name: "交通/出行" }
      - { slug: health, name: "健康/医疗" }

  other:
    name: "其他"
    icon: "📋"
```

### 5.4 AI Prompt 设计

```python
TITLE_ANALYSIS_PROMPT = """你是北京大学校园信息分类助手。根据以下文章标题和摘要进行分类，并写一句话简要说明。

标题：{title}
摘要：{summary}
来源：{source_name}（{platform_category}）

返回JSON：
{{
  "category": "activity|academic|official_news|party_building|campus_life|other",
  "subcategory": "子分类slug",
  "confidence": 0.0-1.0,
  "tags": ["标签1", "标签2"],
  "importance": 1-5,
  "ai_brief": "一句话中文摘要，不超过30字"
}}
仅返回JSON。"""

FULL_ANALYSIS_PROMPT = """你是北京大学校园信息分类与摘要助手。分析以下文章全文：

标题：{title}
来源：{source_name}
正文：{content}

返回JSON：
{{
  "category": "主分类slug",
  "subcategory": "子分类slug",
  "confidence": 置信度,
  "tags": ["标签1", "标签2", "标签3"],
  "importance": 1-5,
  "ai_brief": "一句话摘要，不超过30字",
  "event_time": "活动时间(如有，否则null)",
  "event_location": "活动地点(如有，否则null)",
  "event_registration": "报名方式(如有，否则null)"
}}
仅返回JSON。"""
```

---

## 6. 前端页面设计（V2 重新设计）

### 6.1 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 密集卡片网格，按类型/来源切换 |
| `/platform/[slug]` | 平台分类页 | 该平台下所有来源的完整文章列表 |
| `/category/[slug]` | 内容分类页 | 该分类下所有文章的完整列表 |
| `/article/[id]` | 文章详情 | 全文 + AI分析 + 原文跳转 |
| `/search?q=xxx` | 搜索页 | 全文搜索 |
| `/admin` | 管理后台 | 数据源管理、抓取日志、手动触发 |

### 6.2 首页布局（核心改动）

**设计原则：信息密度最大化，一眼看到全校动态**

```
┌─────────────────────────────────────────────────────────────┐
│  🏛 PKU Info Hub                              🔍 搜索...    │
│  ─────────────────────────────────────────────────────────  │
│  [ 📂 按内容分类 ]  [ 📡 按来源分类 ]    最后更新: 10:00    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─「按内容分类」模式下的卡片网格布局 ──────────────────┐    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │    │
│  │  │ 🎯 活动 (15)  │  │ 📚 学术 (8)   │  │ 📢 官方 (5)│ │    │
│  │  │──────────────│  │──────────────│  │────────────│ │    │
│  │  │▸ 周末露营报名 │  │▸ 数学建模竞赛 │  │▸ 图书馆调整 │ │    │
│  │  │ AI: 山鹰社3月 │  │ AI: 报名截止  │  │ AI: 3月10日 │ │    │
│  │  │ 春季露营...   │  │ 3月15日...   │  │ 起开放时间..│ │    │
│  │  │              │  │              │  │            │ │    │
│  │  │▸ 摄影展征稿  │  │▸ AI前沿讲座   │  │▸ 餐饮中心通知│ │    │
│  │  │ AI: 青年摄影  │  │ AI: 智能学院  │  │ AI: 农园食堂│ │    │
│  │  │ 学会征集...   │  │ 邀请教授...   │  │ 新增窗口... │ │    │
│  │  │              │  │              │  │            │ │    │
│  │  │▸ 话剧演出    │  │▸ 选课通知     │  │            │ │    │
│  │  │ AI: 百周年讲  │  │ AI: 第三轮选  │  │            │ │    │
│  │  │ 堂本周六...   │  │ 课将于...    │  │            │ │    │
│  │  │              │  │              │  │            │ │    │
│  │  │ ⤵ 更早 (32)  │  │ ⤵ 更早 (19)  │  │ ⤵ 更早 (11)│ │    │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │    │
│  │                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐                  │    │
│  │  │ 🚩 党建 (3)   │  │ 🏫 校园生活(12)│                  │    │
│  │  │──────────────│  │──────────────│                  │    │
│  │  │▸ 主题党日活动 │  │▸ 体育馆开放调整│                  │    │
│  │  │ AI: 法学院党  │  │ AI: 3月起羽毛 │                  │    │
│  │  │ 支部组织...   │  │ 球馆周末...   │                  │    │
│  │  │              │  │              │                  │    │
│  │  │ ⤵ 更早 (7)   │  │▸ 校医院通知   │                  │    │
│  │  └──────────────┘  │ AI: 流感疫苗  │                  │    │
│  │                    │ 接种时间...   │                  │    │
│  │                    │              │                  │    │
│  │                    │ ⤵ 更早 (25)  │                  │    │
│  │                    └──────────────┘                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

切换到「按来源分类」模式：

┌─────────────────────────────────────────────────────────────┐
│  [ 📂 按内容分类 ]  [ 📡 按来源分类 ✓]                       │
│                                                             │
│  ── 偏官方公众号 ──────────────────────────────────────────  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 🍚 餐饮中心   │  │ 🏟 北大体育    │  │ 🎭 百周年讲堂 │      │
│  │   (3条新)     │  │   (2条新)     │  │   (4条新)     │      │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │▸ 农园三层恢复 │  │▸ 游泳馆开放   │  │▸ 交响音乐会   │      │
│  │ AI: 3月7日起  │  │ AI: 春季学期  │  │ AI: 3月8日晚  │      │
│  │ 农园三层...   │  │ 游泳馆...    │  │ 7:30演出...   │      │
│  │              │  │              │  │              │      │
│  │▸ 勺园餐厅调价 │  │▸ 体测安排通知 │  │▸ 话剧《雷雨》 │      │
│  │ AI: 部分窗口  │  │ AI: 大三学生  │  │ AI: 3月15-16 │      │
│  │ 价格微调...   │  │ 体测时间...   │  │ 日连演两场... │      │
│  │              │  │              │  │              │      │
│  │ ⤵ 更早 (8)   │  │ ⤵ 更早 (5)   │  │▸ 昆曲专场     │      │
│  └──────────────┘  └──────────────┘  │ AI: 北方昆曲  │      │
│                                      │ 剧院合作...   │      │
│  ┌──────────────┐  ┌──────────────┐  │              │      │
│  │ 📣 北大团委   │  │ 🎓 学生会     │  │ ⤵ 更早 (12)  │      │
│  │   (1条新)     │  │   (2条新)     │  └──────────────┘      │
│  │──────────────│  │──────────────│                        │
│  │▸ 志愿服务月   │  │▸ 跳蚤市场    │                        │
│  │ AI: 三月志愿  │  │ AI: 春季学期  │                        │
│  │ 服务月启动... │  │ 跳蚤市场...   │                        │
│  │              │  │              │                        │
│  │ ⤵ 更早 (4)   │  │ ⤵ 更早 (9)   │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                             │
│  ── 学院公众号 ──────────────────────────────────────────    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 💼 北大光华   │  │ ⚖ 北大法学院  │  │ 💻 北大信科   │      │
│  │   (2条新)     │  │   (1条新)     │  │   (3条新)     │      │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │  ...          │  │  ...          │  │  ...          │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ── 社团公众号 ──────────────────────────────────────────    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 🐱 北大猫协   │  │ 🏔 北大山鹰社  │  │ 📷 青年摄影   │      │
│  │   (1条新)     │  │   (2条新)     │  │   (1条新)     │      │
│  │──────────────│  │──────────────│  │──────────────│      │
│  │  ...          │  │  ...          │  │  ...          │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 小卡片组件 `SourceCard` 详细设计

```
┌─ SourceCard ──────────────────┐
│ 🎯 活动 (15)           48h 内 │  ← 卡片头：图标+名称+新内容数量
│───────────────────────────────│
│                               │
│ ▸ 周末露营活动报名开始         │  ← 条目标题，可点击跳转到文章详情
│   山鹰社3月春季露营，3/15截止   │  ← AI一句话摘要，灰色小字
│                               │
│ ▸ 青年摄影学会春季摄影展征稿    │
│   征集主题"春日燕园"，4/1截止   │
│                               │
│ ▸ 百周年纪念讲堂话剧演出       │
│   本周六晚7:30《雷雨》演出      │
│                               │
│ ▸ 学生会跳蚤市场              │
│   3月12日二体广场，可摆摊报名   │
│                               │
│ ▸ 定向越野春季赛              │
│   PKU定向3月16日圆明园定向赛    │
│                               │
│ ───── ⤵ 查看更早内容 (32) ──── │  ← 48h前的内容折叠，点击展开
└───────────────────────────────┘

条目结构：
┌───────────────────────────────┐
│ ▸ [可点击标题]                 │  → 点击跳转 /article/[id]
│   [AI摘要灰色小字，1行，≤30字]  │  → ai_brief 字段
│   2小时前 · 来源名称           │  → 时间戳 + 来源（按类型分类时显示）
└───────────────────────────────┘
```

### 6.4 卡片逻辑

**48小时规则：**
- 卡片默认只展示 `published_at` 在最近48小时内的文章条目
- 48小时外的内容收折在底部 `⤵ 查看更早内容 (N)` 按钮中
- 点击按钮展开显示更早的内容（按时间倒序，分页加载）
- 如果48小时内无新内容，卡片显示为灰色/半透明状态，标注"暂无更新"

**卡片排序：**
- 有新内容的卡片排在前面
- 同样有新内容时，按最新一条的时间倒序排列
- 无更新的卡片排在最后

**切换模式：**
- 「按内容分类」：每个卡片对应一个AI分类（活动、学术、官方新闻、党建、校园生活、其他）
- 「按来源分类」：先按平台大类分组（偏官方/学院/社团），每个卡片对应一个具体来源（公众号）

---

## 7. 数据源配置文件（完整版）

```yaml
# data/sources.yaml
# 基于《北京大学数据来源汇总报告》完整数据
# 公众号：全量抓取所有新推文，不做关键词筛选，由AI自动分类

wechat_accounts:

  # ====== 偏官方公众号 ======
  semi_official:
    # 学校级
    - name: "北京大学"
      wechat_id: "iPKU1898"
      note: "党委宣传部/融媒体中心运营，学校重大新闻"
    # 职能部门
    - name: "北京大学餐饮中心官方咨询"
      note: "餐饮中心，食堂菜单/开放时间/就餐通知"
    - name: "北大体育"
      note: "体育教研部，体育课程/赛事/场馆开放"
    - name: "北大团委"
      note: "共青团北京大学委员会，团委活动/志愿服务/社会实践"
    - name: "北京大学百周年纪念讲堂"
      note: "会议中心/讲堂管理办公室，演出预告/票务/文化活动"
    - name: "北京大学学生发展支持中心"
      note: "学生工作部，学生发展指导/心理健康/职业规划"
    - name: "北京大学服务总队"
      note: "学生志愿服务组织，志愿活动/招募信息"
    - name: "北京大学学生会"
      note: "学生会，校园活动/福利信息/学术讲座"
    - name: "北京大学研究生会"
      note: "研究生会，学术活动/研究生权益/文体活动"
    # 其他偏官方（待验证后启用）
    - name: "北大就业"
      note: "就业指导服务中心，招聘信息/宣讲会"
      enabled: false  # 待验证公众号确切名称
    - name: "北大图书馆"
      note: "图书馆，馆藏推荐/开放时间/讲座"
      enabled: false
    - name: "北大招生"
      note: "招生办公室，招生政策/录取动态"
      enabled: false
    - name: "北大校友"
      note: "校友会，校友活动/校友服务"
      enabled: false
    - name: "北大信息化"
      note: "计算中心，IT服务通知/网络维护"
      enabled: false

  # ====== 学院公众号 ======
  college:
    # 理学部
    - name: "北大数学"
      college: "数学科学学院"
      website: "https://www.math.pku.edu.cn/"
      enabled: false  # 待验证确切名称
    - name: "北大物理"
      college: "物理学院"
      website: "https://www.phy.pku.edu.cn/"
      enabled: false
    - name: "北大化学"
      college: "化学与分子工程学院"
      website: "https://www.chem.pku.edu.cn/"
      enabled: false
    - name: "北大生科"
      college: "生命科学学院"
      website: "https://bio.pku.edu.cn/"
      enabled: false
    - name: "北大城环"
      college: "城市与环境学院"
      website: "https://urban.pku.edu.cn/"
      enabled: false
    - name: "北大地空"
      college: "地球与空间科学学院"
      website: "https://sess.pku.edu.cn/"
      enabled: false
    - name: "北大心理"
      college: "心理与认知科学学院"
      website: "https://www.psy.pku.edu.cn/"
      enabled: false
    # 信息与工程学部
    - name: "北大信科"
      college: "信息科学技术学院"
      website: "https://eecs.pku.edu.cn/"
      enabled: false
    - name: "北大计算机"
      college: "计算机学院"
      website: "https://cs.pku.edu.cn/"
      enabled: false
    - name: "北大软微"
      college: "软件与微电子学院"
      website: "https://www.ss.pku.edu.cn/"
      enabled: false
    - name: "北大工学院"
      college: "工学院"
      website: "https://www.coe.pku.edu.cn/"
      enabled: false
    # 人文学部
    - name: "北大中文系"
      college: "中国语言文学系"
      website: "https://chinese.pku.edu.cn/"
      enabled: false
    - name: "北大历史学系"
      college: "历史学系"
      website: "https://www.hist.pku.edu.cn/"
      enabled: false
    - name: "北大考古"
      college: "考古文博学院"
      website: "https://archaeology.pku.edu.cn/"
      enabled: false
    - name: "北大外院"
      college: "外国语学院"
      website: "https://sfl.pku.edu.cn/"
      enabled: false
    # 社会科学学部
    - name: "北大国关"
      college: "国际关系学院"
      website: "https://www.sis.pku.edu.cn/"
      enabled: false
    - name: "北大法学院"
      college: "法学院"
      website: "https://www.law.pku.edu.cn/"
      enabled: false
    - name: "北大新传"
      college: "新闻与传播学院"
      website: "https://sjc.pku.edu.cn/"
      enabled: false
    - name: "北大政管"
      college: "政府管理学院"
      website: "https://www.sg.pku.edu.cn/"
      enabled: false
    # 经济与管理学部
    - name: "北大经院"
      college: "经济学院"
      website: "https://econ.pku.edu.cn/"
      enabled: false
    - name: "北大光华"
      college: "光华管理学院"
      website: "https://www.gsm.pku.edu.cn/"
      enabled: false
    - name: "北大国发院"
      college: "国家发展研究院"
      website: "https://nsd.pku.edu.cn/"
      enabled: false
    # 跨学科
    - name: "北大元培"
      college: "元培学院"
      website: "https://yuanpei.pku.edu.cn/"
      enabled: false
    - name: "北大燕京学堂"
      college: "燕京学堂"
      website: "https://yenching.pku.edu.cn/"
      enabled: false

  # ====== 社团公众号 ======
  club:
    # 用户指定（已确认）
    - name: "爱心驿站"
      type_tag: "公益志愿类"
    - name: "爱徒步的PKUer"
      type_tag: "体育健身类"
    - name: "北大猫协"
      full_name: "北京大学学生流浪猫关爱协会"
      type_tag: "公益志愿类"
    - name: "北京大学青年摄影学会"
      type_tag: "文化艺术类"
    - name: "PKU定向"
      full_name: "北京大学学生定向运动协会"
      type_tag: "体育健身类"
    - name: "PKU烹饪"
      type_tag: "生活类"
    # 补充知名社团
    - name: "北大爱心社"
      full_name: "北京大学爱心社"
      type_tag: "公益志愿类"
      note: "1993年成立，中国高校首家学生志愿服务社团"
    - name: "北大山鹰社"
      full_name: "北京大学山鹰社"
      type_tag: "体育健身类"
      note: "1989年成立，注册社员超7000人"
    - name: "北大车协"
      full_name: "北京大学自行车协会"
      type_tag: "体育健身类"
    - name: "北大阿卡贝拉"
      full_name: "北京大学阿卡贝拉清唱社"
      type_tag: "文化艺术类"
      note: "十佳社团"
    - name: "北大天文"
      full_name: "北京大学青年天文学会"
      type_tag: "学术科创类"

# ====== 网站数据源（预留，暂不启用）======
websites:
  official:
    - name: "北京大学教务部-通知公告"
      url: "https://dean.pku.edu.cn/web/notice.php"
      selectors:
        list: ".notice-list li"
        title: "a"
        date: ".date"
        link: "a@href"
      enabled: false
    - name: "北京大学新闻网"
      url: "https://news.pku.edu.cn/"
      enabled: false
    - name: "北京大学百周年纪念讲堂"
      url: "https://pkuhall.pku.edu.cn/"
      enabled: false
    - name: "北京大学餐饮中心-通知公告"
      url: "https://cyzx.pku.edu.cn/tzgg/index.htm"
      enabled: false
    - name: "北京大学研究生院"
      url: "https://grs.pku.edu.cn/"
      enabled: false
    - name: "北京大学学生工作部"
      url: "https://xgb.pku.edu.cn/"
      enabled: false
    - name: "北京大学就业指导服务中心"
      url: "https://scc.pku.edu.cn/"
      enabled: false
    - name: "北京大学图书馆"
      url: "https://www.lib.pku.edu.cn/"
      enabled: false
    - name: "共青团北京大学委员会"
      url: "https://youth.pku.edu.cn/"
      enabled: false
    - name: "北京大学未名BBS"
      url: "https://bbs.pku.edu.cn/v2/home.php"
      enabled: false
  college_websites:
    - name: "数学科学学院"
      url: "https://www.math.pku.edu.cn/"
      enabled: false
    - name: "物理学院"
      url: "https://www.phy.pku.edu.cn/"
      enabled: false
    - name: "化学与分子工程学院"
      url: "https://www.chem.pku.edu.cn/"
      enabled: false
    - name: "生命科学学院"
      url: "https://bio.pku.edu.cn/"
      enabled: false
    - name: "信息科学技术学院"
      url: "https://eecs.pku.edu.cn/"
      enabled: false
    - name: "计算机学院"
      url: "https://cs.pku.edu.cn/"
      enabled: false
    - name: "法学院"
      url: "https://www.law.pku.edu.cn/"
      enabled: false
    - name: "经济学院"
      url: "https://econ.pku.edu.cn/"
      enabled: false
    - name: "光华管理学院"
      url: "https://www.gsm.pku.edu.cn/"
      enabled: false
    - name: "国家发展研究院"
      url: "https://nsd.pku.edu.cn/"
      enabled: false
```

---

## 8. 构建步骤（给 Claude Code 的执行计划）

### Phase 1：项目初始化
1. 创建 Next.js 项目 (`npx create-next-app@latest pku-info-hub --typescript --tailwind --app`)
2. 安装依赖：`prisma`, `@prisma/client`, `shadcn/ui`, `lucide-react`, `dayjs`
3. 初始化 Prisma，配置 SQLite
4. 创建数据库 schema（按第3节）
5. 运行 `prisma migrate`
6. 初始化 shadcn/ui 组件库

### Phase 2：Python 采集服务
7. 创建 `crawler/` 目录，编写 `requirements.txt`
8. 安装依赖：`httpx`, `beautifulsoup4`, `apscheduler`, `sqlalchemy`, `pyyaml`, `loguru`
9. 实现 `SiliconFlowClient` — SiliconFlow API 客户端
10. 实现 `WeChatCrawler` — 搜狗微信抓取器，全量抓取不筛选
11. 实现 `ArticleClassifier` — 两级AI分类器，输出 ai_brief
12. 实现 `main.py` — APScheduler 调度（`hour=0,7-23, minute=0`）
13. 编写 `data/sources.yaml`（使用第7节完整配置）
14. 实现 `WebsiteCrawler` 预留接口（空实现）

### Phase 3：前端页面（V2 密集布局）
15. 实现全局布局（Header + 顶部切换栏）
16. 实现 `SourceCard` 组件 — 小卡片，条目式，含AI摘要
17. 实现 `CardGrid` 组件 — 响应式网格布局
18. 实现 `ViewToggle` 组件 — 按类型/按来源切换
19. 实现首页 — 密集卡片网格，48小时折叠逻辑
20. 实现按平台分类页面
21. 实现按内容分类页面
22. 实现文章详情页（全文 + AI分析 + 原文跳转）
23. 实现搜索功能
24. 实现管理后台（数据源管理 + 抓取日志 + 手动触发）

### Phase 4：API 层
25. `GET /api/articles` — 文章列表（分页、按分类/来源筛选、48h标记）
26. `GET /api/articles/[id]` — 文章详情
27. `GET /api/categories` — 分类列表及各分类48h内计数
28. `GET /api/sources` — 数据源列表及各来源48h内计数
29. `POST /api/admin/trigger-crawl` — 手动触发抓取

### Phase 5：部署配置
30. 编写 `deploy/setup.sh` — 服务器一键初始化脚本
31. 编写 `deploy/nginx.conf` — Nginx反向代理配置
32. 编写 `deploy/ecosystem.config.js` — pm2进程管理
33. 编写 `.env.example`
34. 编写 `README.md`

---

## 9. 环境变量配置

```env
# .env
DATABASE_URL="file:./data/pku-info-hub.db"

SILICONFLOW_API_KEY="sk-xxx"
SILICONFLOW_LIGHT_MODEL="Qwen/Qwen2.5-7B-Instruct"
SILICONFLOW_HEAVY_MODEL="deepseek-ai/DeepSeek-V3"

CRAWL_INTERVAL_HOURS=1
CRAWL_SLEEP_START=1
CRAWL_SLEEP_END=7

ADMIN_PASSWORD="your-admin-password"
NODE_ENV="production"
PORT=3000
```

---

## 10. 验证方案

1. **采集服务验证**：`python crawler/main.py --test` 测试搜狗微信抓取
2. **AI分析验证**：用测试数据确认分类+ai_brief输出正确
3. **数据库验证**：检查去重逻辑、48h查询性能
4. **前端验证**：
   - 首页卡片网格正确渲染
   - 按类型/按来源切换正常
   - 48小时折叠/展开正常
   - 条目点击跳转正确
   - AI摘要正确显示
5. **端到端验证**：完整抓取→AI分析→入库→前端展示
6. **定时任务验证**：1:00-7:00不触发，其他时间正常

---

## 11. 部署方案（阿里云 ECS 2核2G）

### 11.1 服务器信息

| 项目 | 配置 |
|------|------|
| 实例规格 | ecs.e-c1m1.large |
| CPU | 2 核 (vCPU) |
| 内存 | 2 GiB |
| 系统盘 | ESSD Entry 40 GiB |
| 公网IP | 8.140.215.49 |
| 带宽 | 3 Mbps（按固定带宽） |
| 操作系统 | Alibaba Cloud Linux 3.2104 LTS 64位 |
| 到期时间 | 2027年3月4日 |

### 11.2 内存规划

**总计 2048 MB，规划如下：**

| 组件 | 预估内存 | 说明 |
|------|---------|------|
| 系统 + sshd + 基础进程 | ~300 MB | 包含内核、systemd等 |
| Nginx | ~10 MB | 极轻量 |
| Next.js (production build) | ~350 MB | `next build` 后以 `next start` 运行 |
| Python 采集服务 | ~150 MB | httpx + APScheduler + SQLAlchemy |
| SQLite | ~10 MB | 嵌入式，几乎不占额外内存 |
| Swap 缓冲区 | 1024 MB | 防止OOM |
| **合计（不含swap）** | **~820 MB** | 留有余量 |

### 11.3 一键部署脚本 `deploy/setup.sh`

```bash
#!/bin/bash
# PKU Info Hub 服务器初始化脚本
# 目标: Alibaba Cloud Linux 3 / 2核2G
set -e

echo "===== 1. 系统更新 + 基础工具 ====="
sudo yum update -y
sudo yum install -y git nginx

echo "===== 2. 创建 1GB Swap（2G内存必须） ====="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    # 调整 swappiness，尽量用物理内存
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
fi
echo "Swap 状态:"
free -h

echo "===== 3. 安装 Node.js 20 LTS ====="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
node -v && npm -v

echo "===== 4. 安装 pm2（进程管理器）====="
sudo npm install -g pm2
pm2 -v

echo "===== 5. 安装 Python 3.11 + pip ====="
sudo yum install -y python3.11 python3.11-pip
python3.11 --version

echo "===== 6. 创建项目目录 ====="
sudo mkdir -p /opt/pku-info-hub
sudo chown $(whoami):$(whoami) /opt/pku-info-hub

echo "===== 7. 克隆项目（替换为你的仓库地址）====="
cd /opt/pku-info-hub
# git clone https://github.com/你的用户名/pku-info-hub.git .

echo "===== 8. 安装 Node.js 依赖 + 构建 ====="
npm ci --production=false   # 安装所有依赖（含devDependencies用于构建）
npx prisma generate          # 生成Prisma客户端
npx prisma migrate deploy    # 执行数据库迁移
npm run build                # 构建Next.js生产版本

echo "===== 9. 安装 Python 依赖 ====="
cd /opt/pku-info-hub/crawler
python3.11 -m pip install -r requirements.txt

echo "===== 10. 配置环境变量 ====="
cd /opt/pku-info-hub
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 .env 文件填入你的 SILICONFLOW_API_KEY"
fi

echo "===== 11. 配置 Nginx ====="
sudo cp deploy/nginx.conf /etc/nginx/conf.d/pku-info-hub.conf
sudo nginx -t && sudo systemctl enable nginx && sudo systemctl restart nginx

echo "===== 12. 启动服务 ====="
cd /opt/pku-info-hub
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # 设置开机自启

echo "===== 完成！====="
echo "网站地址: http://8.140.215.49"
echo "管理后台: http://8.140.215.49/admin"
echo ""
echo "常用命令:"
echo "  pm2 status          # 查看进程状态"
echo "  pm2 logs            # 查看日志"
echo "  pm2 restart all     # 重启所有服务"
echo "  pm2 monit           # 监控面板"
```

### 11.4 pm2 进程配置 `deploy/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'pku-web',              // Next.js 前端+API
      cwd: '/opt/pku-info-hub',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '400M',   // 内存超400M自动重启
      instances: 1,                 // 2G内存只跑1个实例
      autorestart: true,
      watch: false,
    },
    {
      name: 'pku-crawler',          // Python 采集服务
      cwd: '/opt/pku-info-hub/crawler',
      script: 'main.py',
      interpreter: '/usr/bin/python3.11',
      max_memory_restart: '200M',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 7 * * *',   // 每天7点重启一次（清理内存）
    }
  ]
};
```

### 11.5 Nginx 配置 `deploy/nginx.conf`

```nginx
server {
    listen 80;
    server_name 8.140.215.49;    # 后续可改为域名

    # gzip压缩，节省带宽（3Mbps有限）
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # 静态资源缓存（Next.js _next/static）
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # API 和页面
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 限制请求频率（防刷）
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 11.6 日常运维命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs pku-web --lines 50
pm2 logs pku-crawler --lines 50

# 查看资源占用
pm2 monit
free -h
df -h

# 手动触发一次抓取（测试用）
cd /opt/pku-info-hub/crawler && python3.11 main.py --test

# 更新部署（拉取新代码后）
cd /opt/pku-info-hub
git pull
npm ci && npm run build
npx prisma migrate deploy
pm2 restart all

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 数据库备份（建议每天自动执行）
cp /opt/pku-info-hub/data/pku-info-hub.db /opt/pku-info-hub/data/backup/pku-info-hub-$(date +%Y%m%d).db
```

### 11.7 可选：配置域名 + HTTPS

```bash
# 1. 在阿里云DNS解析中添加A记录：你的域名 → 8.140.215.49

# 2. 安装 certbot（免费SSL证书）
sudo yum install -y certbot python3-certbot-nginx

# 3. 申请证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com

# 4. 自动续期
sudo certbot renew --dry-run
```

### 11.8 磁盘空间管理

40GB 系统盘的空间规划：

| 用途 | 预估占用 | 说明 |
|------|---------|------|
| 系统 + 基础软件 | ~8 GB | OS + Nginx + Node.js + Python |
| 项目代码 + node_modules | ~1 GB | |
| Next.js 构建产物 | ~0.5 GB | .next 目录 |
| SQLite 数据库 | ~0.5 GB (1年后) | 每天约50篇文章，纯文本 |
| 日志文件 | ~1 GB | pm2 + Nginx 日志，定期清理 |
| Swap 文件 | 1 GB | |
| **合计** | **~12 GB** | 剩余 ~28 GB 充裕 |

日志自动清理（加入 crontab）：
```bash
# 每周清理超过7天的pm2日志
0 3 * * 0 pm2 flush

# 每月清理Nginx日志
0 3 1 * * sudo logrotate -f /etc/logrotate.d/nginx
```

---

## 12. 风险与备选方案

| 风险 | 影响 | 应对方案 |
|------|------|---------|
| 搜狗微信搜索反爬 | 抓取失败 | 添加随机延迟(2-5s)、更换User-Agent、备选用RSS服务 |
| 2G内存OOM | 服务崩溃 | Swap兜底 + pm2 max_memory_restart + 每日定时重启 |
| 3Mbps带宽不够 | 访问慢 | Nginx gzip压缩 + 静态缓存 + 升级带宽 |
| SiliconFlow API故障 | AI分类失败 | 本地缓存未分类文章，恢复后批量补分类 |
| 公众号改名/注销 | 抓取空结果 | 日志告警，管理后台标记异常源 |
