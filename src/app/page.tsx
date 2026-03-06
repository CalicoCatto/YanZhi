import { db } from '@/lib/db'
import { HomeClient } from '@/components/HomeClient'
import dayjs from 'dayjs'
import type { ArticleItem, CategoryInfo, SourceInfo } from '@/lib/types'

const CATEGORIES: CategoryInfo[] = [
  { slug: 'activity', name: '活动', icon: '🎯', total: 0, recent: 0 },
  { slug: 'academic', name: '学术', icon: '📚', total: 0, recent: 0 },
  { slug: 'news', name: '官方新闻', icon: '📢', total: 0, recent: 0 },
  { slug: 'party', name: '党建', icon: '🔴', total: 0, recent: 0 },
  { slug: 'campus', name: '校园生活', icon: '🏫', total: 0, recent: 0 },
  { slug: 'other', name: '其他', icon: '📌', total: 0, recent: 0 },
]

const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  活动: 'activity',
  学术: 'academic',
  官方新闻: 'news',
  党建: 'party',
  校园生活: 'campus',
  其他: 'other',
}

export const revalidate = 300 // 5分钟重新验证

export default async function HomePage() {
  const cutoff48h = dayjs().subtract(48, 'hour').toDate()

  // 并行获取所有需要数据
  const [sourcesRaw, categoryCounts, category48hCounts, allRecentArticles] = await Promise.all([
    db.source.findMany({
      where: { enabled: true },
      include: { _count: { select: { articles: true } } },
      orderBy: [{ platformCategory: 'asc' }, { name: 'asc' }],
    }),
    db.article.groupBy({ by: ['aiCategory'], _count: { id: true } }),
    db.article.groupBy({
      by: ['aiCategory'],
      where: { publishedAt: { gte: cutoff48h } },
      _count: { id: true },
    }),
    db.article.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 500,
      include: { source: { select: { id: true, name: true, platformCategory: true } } },
    }),
  ])

  // 构建分类数据
  const countMap = Object.fromEntries(categoryCounts.map((c) => [c.aiCategory, c._count.id]))
  const count48hMap = Object.fromEntries(category48hCounts.map((c) => [c.aiCategory, c._count.id]))

  const categories: CategoryInfo[] = CATEGORIES.map((cat) => ({
    ...cat,
    total: countMap[cat.name] ?? 0,
    recent: count48hMap[cat.name] ?? 0,
  }))

  // 构建来源数据
  const recentCountBySource = allRecentArticles
    .filter((a) => new Date(a.publishedAt) >= cutoff48h)
    .reduce<Record<number, number>>((acc, a) => {
      acc[a.sourceId] = (acc[a.sourceId] ?? 0) + 1
      return acc
    }, {})

  const latestBySource = allRecentArticles.reduce<Record<number, string>>((acc, a) => {
    if (!acc[a.sourceId]) acc[a.sourceId] = a.publishedAt.toISOString()
    return acc
  }, {})

  const sources: SourceInfo[] = sourcesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    platformCategory: s.platformCategory,
    identifier: s.identifier,
    total: s._count.articles,
    recent: recentCountBySource[s.id] ?? 0,
    latestAt: latestBySource[s.id] ?? null,
  }))

  // 转换文章格式
  const toArticleItem = (a: typeof allRecentArticles[0]): ArticleItem => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    aiBrief: a.aiBrief,
    aiCategory: a.aiCategory,
    aiSubcategory: a.aiSubcategory,
    aiTags: JSON.parse(a.aiTags || '[]'),
    aiImportance: a.aiImportance,
    originalUrl: a.originalUrl,
    publishedAt: a.publishedAt.toISOString(),
    crawledAt: a.crawledAt.toISOString(),
    eventTime: a.eventTime,
    eventLocation: a.eventLocation,
    eventRegistration: a.eventRegistration,
    source: a.source,
  })

  // 按分类分组（每类最多10条近48h，10条更早）
  const articlesByCategory: Record<string, { recent: ArticleItem[]; older: ArticleItem[] }> = {}
  for (const cat of CATEGORIES) {
    const catArticles = allRecentArticles.filter((a) => a.aiCategory === cat.name)
    const recent = catArticles.filter((a) => new Date(a.publishedAt) >= cutoff48h).slice(0, 10).map(toArticleItem)
    const older = catArticles.filter((a) => new Date(a.publishedAt) < cutoff48h).slice(0, 10).map(toArticleItem)
    articlesByCategory[cat.name] = { recent, older }
  }

  // 按来源分组
  const articlesBySource: Record<number, { recent: ArticleItem[]; older: ArticleItem[] }> = {}
  for (const src of sourcesRaw) {
    const srcArticles = allRecentArticles.filter((a) => a.sourceId === src.id)
    const recent = srcArticles.filter((a) => new Date(a.publishedAt) >= cutoff48h).slice(0, 8).map(toArticleItem)
    const older = srcArticles.filter((a) => new Date(a.publishedAt) < cutoff48h).slice(0, 8).map(toArticleItem)
    articlesBySource[src.id] = { recent, older }
  }

  const lastUpdated = dayjs().format('MM-DD HH:mm')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-gray-900">燕知</h1>
          <a
            href="/search"
            className="flex-1 max-w-sm text-sm text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-300 transition-colors"
          >
            搜索校园资讯...
          </a>
          <a href="/admin" className="text-xs text-gray-400 hover:text-gray-600">
            管理
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <HomeClient
          categories={categories}
          sources={sources}
          articlesByCategory={articlesByCategory}
          articlesBySource={articlesBySource}
          lastUpdated={lastUpdated}
        />
      </div>
    </main>
  )
}
