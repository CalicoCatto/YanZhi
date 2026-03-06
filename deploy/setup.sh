#!/bin/bash
# 燕知 — 阿里云 ECS 一键初始化脚本（Ubuntu 22.04）
set -e

echo "=== 燕知部署脚本 ==="

# 更新系统
apt-get update && apt-get upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 安装 Python 3 + pip
apt-get install -y python3 python3-pip python3-venv

# 安装 Nginx
apt-get install -y nginx

# 安装 pm2
npm install -g pm2

# 创建项目目录
mkdir -p /var/www/yanzhi
cd /var/www/yanzhi

# 配置 Swap（2GB机器增加1GB swap）
if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap 配置完成"
fi

echo ""
echo "=== 接下来手动操作 ==="
echo "1. 将项目代码上传到 /var/www/yanzhi/"
echo "2. 复制 .env.example 为 .env 并填写配置"
echo "3. npm install && npm run build"
echo "4. npx prisma migrate deploy"
echo "5. cd crawler && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "6. cp deploy/nginx.conf /etc/nginx/sites-available/yanzhi && ln -s /etc/nginx/sites-available/yanzhi /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
echo "7. pm2 start deploy/ecosystem.config.js && pm2 save && pm2 startup"
