'use client'
import { useState } from 'react'
import { ViewToggle } from './ViewToggle'
import { SourceCard } from './SourceCard'
import type { ArticleItem, CategoryInfo, SourceInfo, ViewMode } from '@/lib/types'

const PLATFORM_LABELS: Record<string, string> = {
  official: '半官方',
  school: '学院',
  club: '社团',
}

interface Props {
  categories: CategoryInfo[]
  sources: SourceInfo[]
  articlesByCategory: Record<string, { recent: ArticleItem[]; older: ArticleItem[] }>
  articlesBySource: Record<number, { recent: ArticleItem[]; older: ArticleItem[] }>
  lastUpdated: string
}

export function HomeClient({
  categories,
  sources,
  articlesByCategory,
  articlesBySource,
  lastUpdated,
}: Props) {
  const [mode, setMode] = useState<ViewMode>('category')

  const sortedCategories = [...categories].sort((a, b) => b.recent - a.recent)

  const groupedSources = sources.reduce<Record<string, SourceInfo[]>>((acc, s) => {
    const key = s.platformCategory
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const platformOrder = ['official', 'school', 'club']

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <ViewToggle mode={mode} onChange={setMode} />
        <span className="text-xs text-gray-400">最后更新：{lastUpdated}</span>
      </div>

      {/* Category view */}
      {mode === 'category' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCategories.map((cat) => {
            const data = articlesByCategory[cat.name] ?? { recent: [], older: [] }
            return (
              <SourceCard
                key={cat.slug}
                title={cat.name}
                icon={cat.icon}
                slug={cat.slug}
                linkPrefix="category"
                recentCount={cat.recent}
                articles={data.recent}
                olderCount={data.older.length}
                olderArticles={data.older}
              />
            )
          })}
        </div>
      )}

      {/* Source view */}
      {mode === 'source' && (
        <div className="space-y-6">
          {platformOrder.map((platform) => {
            const srcs = groupedSources[platform]
            if (!srcs?.length) return null
            const sortedSrcs = [...srcs].sort((a, b) => {
              if (b.recent !== a.recent) return b.recent - a.recent
              const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0
              const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0
              return bTime - aTime
            })
            return (
              <div key={platform}>
                <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                  {PLATFORM_LABELS[platform] ?? platform}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedSrcs.map((src) => {
                    const data = articlesBySource[src.id] ?? { recent: [], older: [] }
                    return (
                      <SourceCard
                        key={src.id}
                        title={src.name}
                        icon="📄"
                        slug={String(src.id)}
                        linkPrefix="platform"
                        recentCount={src.recent}
                        articles={data.recent}
                        olderCount={data.older.length}
                        olderArticles={data.older}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
