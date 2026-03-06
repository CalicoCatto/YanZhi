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
      name: 'yanzhi-ai',
      script: 'server/api_server.py',
      interpreter: '/var/www/yanzhi/server/venv/bin/python3',
      cwd: '/var/www/yanzhi',
      env: {
        PYTHONPATH: '/var/www/yanzhi/server',
      },
      max_memory_restart: '200M',
      restart_delay: 3000,
      autorestart: true,
      watch: false,
    },
  ],
}
