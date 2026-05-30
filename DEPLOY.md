# CAD 文件规范审核系统 — 云平台部署指南

## ✅ 当前状态：本地全栈服务运行中！

| 组件 | 状态 | 地址 |
|------|------|------|
| 本地全栈服务 | ✅ 运行中 | http://localhost:3001 |
| 前端界面 | ✅ 已部署 | https://39eca65e291f4f34a36b7f42c16e1dbf.app.codebuddy.work |
| 登录功能 | ✅ 已验证 | admin@cad-audit.com / Cad@2026 |
| 云端待部署 | ⏳ 需要后端环境 | 见下方方案二/三/四 |

> **登录问题已解决！** 本地全栈服务前后端同时运行，可直接使用全部功能。

---

## 方案一：本地一键启动 (推荐用于内网/测试)

### 前提条件
- 已安装 Node.js 16+
- 项目文件完整

### 启动步骤

```bash
# 1. 进入 server 目录
cd server

# 2. 安装依赖 (首次)
npm install

# 3. 一键启动全栈服务
node serve.js
```

### 访问地址
- 前端: http://localhost:3001
- API: http://localhost:3001/api
- 健康检查: http://localhost:3001/health

### 内置账号
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 系统管理员 | admin@cad-audit.com | Cad@2026 |
| 工作者 | worker1@cad-audit.com | Cad@2026 |
| 工作者 | worker2@cad-audit.com | Cad@2026 |
| 工作者 | worker3@cad-audit.com | Cad@2026 |

### Windows 一键启动
双击 `server/start.bat` 即可自动启动

---

## 方案二：Render 免费部署 (推荐用于公网24/7)

### 步骤 1: 准备部署包

创建 `deploy/` 目录，包含：

```
deploy/
├── serve.js          # 全栈服务器入口
├── dist/             # 编译后的后端代码
│   ├── app.js
│   └── ...           # 所有编译产物
├── client/
│   └── dist/         # 构建后的前端
│       ├── index.html
│       └── assets/
├── package.json      # 依赖声明
├── .env              # 环境配置
└── data/             # 数据持久化目录 (自动创建)
```

### 步骤 2: 创建 Render 配置文件

**`render.yaml`**
```yaml
services:
  - type: web
    name: cad-audit-system
    runtime: nodejs
    plan: free
    branch: main
    buildCommand: "cd server && npm ci"
    startCommand: "node serve.js"
    envVars:
      - key: PORT
        value: 10000
      - key: NODE_ENV
        value: production
    disk:
      name: data
      mountPath: /opt/render/project/server/data
      sizeGB: 1
```

### 步骤 3: 推送到 GitHub

```bash
git init
git add .
git commit -m "CAD 审计系统 - 初始部署"
git remote add origin <你的GitHub仓库地址>
git push -u origin main
```

### 步骤 4: 在 Render 部署

1. 访问 https://render.com
2. 使用 GitHub 登录
3. 点击 "New + Web Service"
4. 选择你的 GitHub 仓库
5. 配置与 render.yaml 一致
6. 点击 "Deploy"

部署完成后，Render 会提供一个公开访问的 URL，如：
`https://cad-audit-system.onrender.com`

### 注意事项
- **免费套餐**: 有 15 分钟无请求自动休眠，再次访问需 ~30 秒唤醒
- **数据持久化**: 使用 Render Disk 持久化内存数据库 JSON 文件
- **域名**: 可绑定自定义域名 (需付费升级)

---

## 方案三：Railway 部署 (更快的冷启动)

### 步骤

1. 访问 https://railway.app
2. GitHub 登录 → New Project → Deploy from GitHub repo
3. Railway 自动检测 Node.js 项目
4. 设置环境变量：
   - `PORT` = 3001
   - `NODE_ENV` = production
5. 点击 Deploy

### 优势
- 冷启动更快 (~5秒 vs Render 30秒)
- 免费额度: $5/月 (足够小型项目)
- 内建 PostgreSQL 可选 (替代内存DB)

---

## 方案四：自有服务器 / VPS 部署 (生产推荐)

### 系统要求
- Ubuntu 20.04+ / CentOS 8+
- Node.js 18 LTS
- Nginx (反向代理)
- PM2 (进程管理)

### 部署脚本

```bash
#!/bin/bash
# deploy.sh - CAD审计系统生产环境部署脚本

echo "=== CAD 审计系统部署脚本 ==="

# 1. 安装 Node.js (如果没有)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. 安装 PM2 进程管理器
sudo npm install -g pm2

# 3. 上传项目文件到 /var/www/cad-audit
sudo mkdir -p /var/www/cad-audit
# (使用 scp/sftp 上传整个 server 目录)

cd /var/www/cad-audit/server

# 4. 安装依赖
npm install --production

# 5. 使用 PM2 启动 (自动重启、开机自启)
pm2 start serve.js --name "cad-audit"
pm2 save
pm2 startup

# 6. 配置 Nginx 反向代理
sudo tee /etc/nginx/sites-available/cad-audit << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/cad-audit /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== 部署完成! ==="
echo "访问地址: http://your-domain.com"
echo "管理命令: pm2 status | pm2 logs cad-audit | pm2 restart cad-audit"
```

### 常用命令
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs cad-audit --lines 100

# 重启服务
pm2 restart cad-audit

# 停止服务
pm2 stop cad-audit
```

---

## 部署对比表

| 特性 | 本地启动 | CloudStudio | Render 免费 | Railway | VPS 自有 |
|------|---------|-------------|-------------|---------|----------|
| 成本 | 免费 | 免费 | 免费 | $5/月免费额度 | ¥30-100/月 |
| 全栈支持 | ✅ | ❌ 仅前端 | ✅ | ✅ | ✅ |
| 24/7 在线 | ❌ 关机即停 | ✅ | ⚠️ 有休眠 | ✅ | ✅ |
| 冷启动 | - | - | ~30秒 | ~5秒 | - |
| 自定义域名 | ❌ | ❌ | ✅ 付费 | ✅ | ✅ |
| 数据库 | 内存JSON | - | 持久磁盘 | PostgreSQL可选 | MySQL/PG |
| 难度 | ⭐ | ⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 推荐场景 | 开发测试 | 前端预览 | 个人项目 | 小团队 | 生产环境 |

---

## 快速验证清单

部署后执行以下检查：

```bash
# 1. 健康检查
curl https://your-domain.com/health
# 预期: {"status":"ok","service":"CAD 审计系统全栈服务",...}

# 2. 管理员登录
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"admin@cad-audit.com","password":"Cad@2026"}'
# 预期: 返回 token

# 3. 前端可访问
# 浏览器打开 https://your-domain.com
# 应显示登录页面
```

---

## 下一步建议

1. **立即可用**: 使用 `方案一` 本地启动，功能完整
2. **快速体验**: CloudStudio 链接可查看前端界面
3. **正式部署**: 推荐 `方案四` (VPS) 或 `方案二` (Render)
4. **数据库升级**: 生产环境建议替换为 MySQL/PostgreSQL

---

*文档更新时间: 2026-05-30*
