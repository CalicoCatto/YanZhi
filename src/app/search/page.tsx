import Link from 'next/link'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const articles = query
    ? await db.article.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { summary: { contains: query } },
            { aiBrief: { contains: query } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
        include: { source: { select: { name: true } } },
      })
    : []

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">
            ← 返回
          </Link>
          <form className="flex-1" method="get">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="搜索校园资讯..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
              autoFocus
            />
          </form>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {query && (
          <p className="text-sm text-gray-400 mb-4">
            "{query}" 共找到 {articles.length} 条结果
          </p>
        )}

        {articles.length === 0 && query && (
          <p className="text-gray-400 text-center py-16">未找到相关内容</p>
        )}

        <div className="space-y-3">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/article/${a.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span className="text-blue-500">{a.aiCategory}</span>
                <span>·</span>
                <span>{a.source.name}</span>
                <span>·</span>
                <span>{dayjs(a.publishedAt).format('MM-DD')}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{a.title}</p>
              {a.aiBrief && (
                <p className="text-xs text-gray-400 mt-0.5">{a.aiBrief}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
