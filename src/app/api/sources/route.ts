import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

export async function GET() {
  const cutoff48h = dayjs().subtract(48, 'hour').toDate()

  const sources = await db.source.findMany({
    where: { enabled: true },
    orderBy: [{ platformCategory: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { articles: true } },
    },
  })

  const recentCounts = await db.article.groupBy({
    by: ['sourceId'],
    where: { publishedAt: { gte: cutoff48h } },
    _count: { id: true },
  })

  const recentMap = Object.fromEntries(recentCounts.map((c) => [c.sourceId, c._count.id]))

  const latestArticles = await Promise.all(
    sources.map((s) =>
      db.article.findFirst({
        where: { sourceId: s.id },
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      })
    )
  )

  const result = sources.map((s, i) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    platformCategory: s.platformCategory,
    identifier: s.identifier,
    total: s._count.articles,
    recent: recentMap[s.id] ?? 0,
    latestAt: latestArticles[i]?.publishedAt ?? null,
  }))

  return NextResponse.json({ sources: result })
}
