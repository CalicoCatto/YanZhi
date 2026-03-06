import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

interface ArticleInput {
  title: string
  original_url: string
  summary?: string
  content?: string
  cover_image?: string | null
  author: string
  published_at: string
}

interface ClassifyResult {
  category: string
  subcategory: string
  tags: string[]
  importance: number
  ai_brief: string
  event_time?: string | null
  event_location?: string | null
  event_registration?: string | null
  analysis_level: number
}

async function classifyArticle(article: ArticleInput): Promise<ClassifyResult> {
  const res = await fetch('http://127.0.0.1:8001/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: article.title,
      summary: article.summary ?? '',
      content: article.content ?? '',
    }),
  })
  if (!res.ok) throw new Error(`AI service error: ${res.status}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  // Auth
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.INGEST_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { articles?: ArticleInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const articles = body.articles ?? []
  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ received: 0, saved: 0, skipped: 0 })
  }

  let saved = 0
  let skipped = 0

  for (const article of articles) {
    if (!article.title || !article.original_url || !article.author) {
      skipped++
      continue
    }

    const contentHash = createHash('md5')
      .update(article.original_url + article.title)
      .digest('hex')

    // Dedup check
    const existing = await db.article.findUnique({ where: { contentHash } })
    if (existing) {
      skipped++
      continue
    }

    // Upsert source by author name
    const source = await db.source.upsert({
      where: { name: article.author },
      create: {
        name: article.author,
        type: 'wechat',
        platformCategory: 'wechat',
        identifier: '',
        enabled: true,
      },
      update: {},
    })

    // AI classification
    let aiResult: ClassifyResult = {
      category: '其他',
      subcategory: '',
      tags: [],
      importance: 3,
      ai_brief: '',
      event_time: null,
      event_location: null,
      event_registration: null,
      analysis_level: 0,
    }
    try {
      aiResult = await classifyArticle(article)
    } catch (e) {
      console.error('[ingest] classify failed:', e)
    }

    await db.article.create({
      data: {
        sourceId: source.id,
        title: article.title,
        summary: article.summary ?? '',
        content: article.content ?? '',
        originalUrl: article.original_url,
        coverImage: article.cover_image ?? null,
        author: article.author,
        publishedAt: new Date(article.published_at),
        contentHash,
        aiCategory: aiResult.category,
        aiSubcategory: aiResult.subcategory,
        aiTags: JSON.stringify(aiResult.tags),
        aiImportance: aiResult.importance,
        aiBrief: aiResult.ai_brief,
        aiAnalysisLevel: aiResult.analysis_level,
        eventTime: aiResult.event_time ?? null,
        eventLocation: aiResult.event_location ?? null,
        eventRegistration: aiResult.event_registration ?? null,
      },
    })

    saved++
  }

  return NextResponse.json({ received: articles.length, saved, skipped })
}
