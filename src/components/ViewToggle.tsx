'use client'
import type { ViewMode } from '@/lib/types'

interface Props {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
      <button
        onClick={() => onChange('category')}
        className={`px-3 py-1.5 transition-colors ${
          mode === 'category'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        按内容分类
      </button>
      <button
        onClick={() => onChange('source')}
        className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
          mode === 'source'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        按来源分类
      </button>
    </div>
  )
}
