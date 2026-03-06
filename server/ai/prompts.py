"""AI 分析 Prompt 模板"""

CATEGORIES = {
    "活动": ["讲座", "竞赛", "招新", "演出", "体育", "志愿", "工作坊", "社交"],
    "学术": ["课程", "考试", "科研", "奖学金"],
    "官方新闻": ["人事", "政策", "成果荣誉"],
    "党建": ["理论学习", "党建活动"],
    "校园生活": ["餐饮", "设施", "交通", "健康"],
    "其他": ["其他"],
}

CATEGORY_LIST = list(CATEGORIES.keys())
SUBCATEGORY_ALL = [sub for subs in CATEGORIES.values() for sub in subs]


def build_level1_prompt(title: str, summary: str) -> list:
    categories_str = "\n".join(
        f"- {cat}：{', '.join(subs)}" for cat, subs in CATEGORIES.items()
    )
    return [
        {
            "role": "system",
            "content": (
                "你是北京大学校园信息分类助手。根据文章标题和摘要，输出JSON分析结果。\n"
                "分类体系：\n" + categories_str + "\n\n"
                "输出格式（仅JSON，不要markdown代码块）：\n"
                '{"category":"主分类","subcategory":"子分类","confidence":0.0~1.0,'
                '"tags":["标签1","标签2"],"importance":1~5,"ai_brief":"一句话摘要（≤30字）"}'
            ),
        },
        {
            "role": "user",
            "content": f"标题：{title}\n摘要：{summary or '（无摘要）'}",
        },
    ]


def build_level2_prompt(title: str, summary: str, content: str) -> list:
    categories_str = "\n".join(
        f"- {cat}：{', '.join(subs)}" for cat, subs in CATEGORIES.items()
    )
    content_excerpt = content[:2000] if content else summary
    return [
        {
            "role": "system",
            "content": (
                "你是北京大学校园信息深度分析助手。根据完整文章内容，输出JSON分析结果。\n"
                "分类体系：\n" + categories_str + "\n\n"
                "输出格式（仅JSON，不要markdown代码块）：\n"
                '{"category":"主分类","subcategory":"子分类","confidence":0.0~1.0,'
                '"tags":["标签1","标签2"],"importance":1~5,"ai_brief":"一句话摘要（≤30字）",'
                '"event_time":"活动时间或null","event_location":"活动地点或null",'
                '"event_registration":"报名方式或null"}'
            ),
        },
        {
            "role": "user",
            "content": f"标题：{title}\n摘要：{summary or ''}\n\n正文节选：\n{content_excerpt}",
        },
    ]
