import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}))

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const crawlerPath = path.join(process.cwd(), 'crawler', 'main.py')

  exec(`python3 ${crawlerPath} --test`, (error) => {
    if (error) {
      console.error('[trigger-crawl] error:', error.message)
    }
  })

  return NextResponse.json({ ok: true, message: '抓取任务已启动（后台运行）' })
}
