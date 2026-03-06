import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import dayjs from 'dayjs'

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page: pageStr } = await searchParams
  const sourceId = parseInt(slug)
  if (isNaN(sourceId)) notFound()

  const source = await db.source.findUnique({ where: { id: sourceId } })
  if (!source) notFound()

  const page = parseInt(pageStr ?? '1')
  const limit = 30

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where: { sourceId },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.article.count({ where: { sourceId } }),
  ])

  const pages = Math.ceil(total / limit)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">
            ← 返回
          </Link>
          <h1 className="font-semibold text-gray-800">📄 {source.name}</h1>
          <span className="text-xs text-gray-400 ml-auto">共 {total} 篇</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/article/${a.id}`}
            className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span className="text-blue-500">{a.aiCategory}</span>
              {a.aiSubcategory && (
                <>
                  <span>·</span>
                  <span>{a.aiSubcategory}</span>
                </>
              )}
              <span>·</span>
              <span>{dayjs(a.publishedAt).format('MM-DD HH:mm')}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{a.title}</p>
            {a.aiBrief && (
              <p className="text-xs text-gray-400 mt-0.5">{a.aiBrief}</p>
            )}
          </Link>
        ))}

        {pages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/platform/${slug}?page=${p}`}
                className={`px-3 py-1 rounded text-sm ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
