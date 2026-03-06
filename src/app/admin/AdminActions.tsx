'use client'
import { useState } from 'react'

export function AdminActions() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const triggerCrawl = async () => {
    if (!password) {
      setStatus('请输入管理员密码')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/trigger-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      setStatus(res.ok ? data.message : data.error)
    } catch {
      setStatus('请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
        手动触发抓取
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理员密码"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-48"
        />
        <button
          onClick={triggerCrawl}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '启动中...' : '立即抓取'}
        </button>
        {status && (
          <span className="text-sm text-gray-500">{status}</span>
        )}
      </div>
    </section>
  )
}
