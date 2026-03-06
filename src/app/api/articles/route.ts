import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const sourceId = searchParams.get('sourceId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const since48h = searchParams.get('since48h') === 'true'
  const q = searchParams.get('q')

  const where: Record<string, unknown> = {}
  if (category) where.aiCategory = category
  if (sourceId) where.sourceId = parseInt(sourceId)
  if (since48h) {
    where.publishedAt = { gte: dayjs().subtract(48, 'hour').toDate() }
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { summary: { contains: q } },
      { aiBrief: { contains: q } },
    ]
  }

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        source: { select: { id: true, name: true, platformCategory: true } },
      },
    }),
    db.article.count({ where }),
  ])

  return NextResponse.json({
    articles: articles.map((a) => ({
      ...a,
      aiTags: JSON.parse(a.aiTags || '[]'),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}
