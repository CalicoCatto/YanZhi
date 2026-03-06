'use client'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import type { ArticleItem as ArticleItemType } from '@/lib/types'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

interface Props {
  article: ArticleItemType
}

export function ArticleItem({ article }: Props) {
  const timeAgo = dayjs(article.publishedAt).fromNow()

  return (
    <div className="py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-3 px-3 rounded transition-colors">
      <Link href={`/article/${article.id}`} className="block">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 hover:text-blue-700">
          {article.title}
        </p>
        {article.aiBrief && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{article.aiBrief}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-300">{article.source.name}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-300">{timeAgo}</span>
          {article.eventLocation && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-blue-400">📍 {article.eventLocation}</span>
            </>
          )}
        </div>
      </Link>
    </div>
  )
}
