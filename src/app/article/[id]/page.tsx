import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await db.article.findUnique({
    where: { id: parseInt(id) },
    include: { source: true },
  })

  if (!article) notFound()

  const tags: string[] = JSON.parse(article.aiTags || '[]')

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">
            ← 返回
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">{article.source.name}</span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Meta */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
              {article.aiCategory}
            </span>
            {article.aiSubcategory && (
              <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                {article.aiSubcategory}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{article.source.name}</span>
            <span>·</span>
            <span>{dayjs(article.publishedAt).format('YYYY-MM-DD HH:mm')}</span>
          </div>

          {article.aiBrief && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-300">
              <p className="text-sm text-blue-700">
                <span className="font-medium">AI摘要：</span>
                {article.aiBrief}
              </p>
            </div>
          )}
        </div>

        {/* Event Info */}
        {(article.eventTime || article.eventLocation || article.eventRegistration) && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">活动信息</h3>
            <div className="space-y-1 text-sm text-amber-700">
              {article.eventTime && <p>🕐 时间：{article.eventTime}</p>}
              {article.eventLocation && <p>📍 地点：{article.eventLocation}</p>}
              {article.eventRegistration && <p>📝 报名：{article.eventRegistration}</p>}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          {article.content ? (
            <div
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : article.summary ? (
            <p className="text-gray-600 leading-relaxed">{article.summary}</p>
          ) : (
            <p className="text-gray-400 italic">暂无正文内容</p>
          )}
        </div>

        {/* Original Link */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            查看原文 ↗
          </a>
        </div>
      </article>
    </main>
  )
}
