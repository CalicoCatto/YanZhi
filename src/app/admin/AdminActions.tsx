'use client'

export function AdminActions() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
        数据采集说明
      </h2>
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-1">
        <p>文章数据由 Windows 端 mitmproxy 拦截器自动推送，无需手动触发。</p>
        <p className="text-gray-400 text-xs">
          确保 Windows 端 <code className="bg-gray-100 px-1 rounded">interceptor.py</code> 已启动，
          并将系统代理设置为 <code className="bg-gray-100 px-1 rounded">127.0.0.1:8080</code>。
        </p>
      </div>
    </section>
  )
}
