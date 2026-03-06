export interface ArticleItem {
  id: number
  title: string
  summary: string
  aiBrief: string
  aiCategory: string
  aiSubcategory: string
  aiTags: string[]
  aiImportance: number
  originalUrl: string
  publishedAt: string
  crawledAt: string
  eventTime?: string | null
  eventLocation?: string | null
  eventRegistration?: string | null
  source: {
    id: number
    name: string
    platformCategory: string
  }
}

export interface SourceInfo {
  id: number
  name: string
  type: string
  platformCategory: string
  identifier: string
  total: number
  recent: number
  latestAt: string | null
}

export interface CategoryInfo {
  slug: string
  name: string
  icon: string
  total: number
  recent: number
}

export type ViewMode = 'category' | 'source'
