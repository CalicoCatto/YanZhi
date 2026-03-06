module.exports = {
  apps: [
    {
      name: 'yanzhi-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/yanzhi',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '400M',
      restart_delay: 3000,
      autorestart: true,
      watch: false,
    },
    {
      name: 'yanzhi-crawler',
      script: 'crawler/main.py',
      interpreter: 'python3',
      cwd: '/var/www/yanzhi',
      env: {
        PYTHONPATH: '/var/www/yanzhi/crawler',
      },
      max_memory_restart: '200M',
      restart_delay: 5000,
      autorestart: true,
      watch: false,
      // 每天早上7点重启采集服务，清理内存
      cron_restart: '0 7 * * *',
    },
  ],
}
