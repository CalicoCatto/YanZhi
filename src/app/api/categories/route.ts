import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

const CATEGORIES = [
  { slug: 'activity', name: '活动', icon: '🎯' },
  { slug: 'academic', name: '学术', icon: '📚' },
  { slug: 'news', name: '官方新闻', icon: '📢' },
  { slug: 'party', name: '党建', icon: '🔴' },
  { slug: 'campus', name: '校园生活', icon: '🏫' },
  { slug: 'other', name: '其他', icon: '📌' },
]

const SLUG_TO_NAME: Record<string, string> = {
  activity: '活动',
  academic: '学术',
  news: '官方新闻',
  party: '党建',
  campus: '校园生活',
  other: '其他',
}

export async function GET() {
  const cutoff48h = dayjs().subtract(48, 'hour').toDate()

  const counts = await db.article.groupBy({
    by: ['aiCategory'],
    _count: { id: true },
  })

  const counts48h = await db.article.groupBy({
    by: ['aiCategory'],
    where: { publishedAt: { gte: cutoff48h } },
    _count: { id: true },
  })

  const countMap = Object.fromEntries(counts.map((c) => [c.aiCategory, c._count.id]))
  const count48hMap = Object.fromEntries(counts48h.map((c) => [c.aiCategory, c._count.id]))

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    total: countMap[cat.name] ?? 0,
    recent: count48hMap[cat.name] ?? 0,
  }))

  return NextResponse.json({ categories })
}
