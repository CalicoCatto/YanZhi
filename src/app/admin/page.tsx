import Link from 'next/link'
import { db } from '@/lib/db'
import dayjs from 'dayjs'
import { AdminActions } from './AdminActions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const [sources, recentLogs, articleCount] = await Promise.all([
    db.source.findMany({
      orderBy: [{ platformCategory: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { articles: true } } },
    }),
    db.crawlLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { source: { select: { name: true } } },
    }),
    db.article.count(),
  ])

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-sm">
              ← 返回首页
            </Link>
            <h1 className="font-semibold text-gray-800">管理后台</h1>
          </div>
          <span className="text-xs text-gray-400">共 {articleCount} 篇文章</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Actions */}
        <AdminActions />

        {/* Sources */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            数据源（{sources.length}）
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">名称</th>
                  <th className="text-left px-4 py-2">类型</th>
                  <th className="text-left px-4 py-2">平台</th>
                  <th className="text-right px-4 py-2">文章数</th>
                  <th className="text-right px-4 py-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-2 text-gray-500">{s.type}</td>
                    <td className="px-4 py-2 text-gray-500">{s.platformCategory}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{s._count.articles}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.enabled
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {s.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Crawl Logs */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            最近抓取日志
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2">数据源</th>
                  <th className="text-left px-4 py-2">状态</th>
                  <th className="text-right px-4 py-2">新文章</th>
                  <th className="text-right px-4 py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{log.source.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-600'
                            : log.status === 'error'
                            ? 'bg-red-100 text-red-500'
                            : 'bg-yellow-100 text-yellow-600'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.errorMessage && (
                        <span className="ml-2 text-xs text-red-400 truncate max-w-xs inline-block">
                          {log.errorMessage}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{log.articlesFound}</td>
                    <td className="px-4 py-2 text-right text-gray-400 text-xs">
                      {dayjs(log.startedAt).format('MM-DD HH:mm')}
                    </td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                      暂无抓取记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
