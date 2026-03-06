import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const article = await db.article.findUnique({
    where: { id: parseInt(id) },
    include: {
      source: { select: { id: true, name: true, platformCategory: true, identifier: true } },
    },
  })

  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...article,
    aiTags: JSON.parse(article.aiTags || '[]'),
  })
}
