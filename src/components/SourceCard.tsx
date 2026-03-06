'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArticleItem } from './ArticleItem'
import type { ArticleItem as ArticleItemType } from '@/lib/types'

interface Props {
  title: string
  icon: string
  slug: string
  linkPrefix: 'category' | 'platform'
  recentCount: number
  articles: ArticleItemType[]
  olderCount: number
  olderArticles?: ArticleItemType[]
}

export function SourceCard({
  title,
  icon,
  slug,
  linkPrefix,
  recentCount,
  articles,
  olderCount,
  olderArticles = [],
}: Props) {
  const [showOlder, setShowOlder] = useState(false)
  const isEmpty = articles.length === 0

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        isEmpty
          ? 'border-gray-100 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <Link
          href={`/${linkPrefix}/${slug}`}
          className="flex items-center gap-1.5 font-semibold text-gray-800 hover:text-blue-700 text-sm"
        >
          <span>{icon}</span>
          <span>{title}</span>
          {recentCount > 0 && (
            <span className="ml-1 text-xs font-normal text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
              {recentCount}
            </span>
          )}
        </Link>
        <span className="text-xs text-gray-300">48h 内</span>
      </div>

      {/* Article List */}
      {isEmpty ? (
        <p className="text-xs text-gray-400 py-2 text-center">暂无更新</p>
      ) : (
        <>
          <div>
            {articles.map((a) => (
              <ArticleItem key={a.id} article={a} />
            ))}
          </div>

          {/* Older articles toggle */}
          {olderCount > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setShowOlder(!showOlder)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 border-t border-dashed border-gray-100 text-center"
              >
                {showOlder ? '收起' : `⤵ 查看更早内容 (${olderCount})`}
              </button>
              {showOlder && olderArticles.map((a) => (
                <ArticleItem key={a.id} article={a} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
