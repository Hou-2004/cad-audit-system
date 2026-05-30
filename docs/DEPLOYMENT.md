# CAD 文件规范审核系统 - 部署文档

## 📋 系统概述

本系统是一个完整的 CAD 文件规范审核平台，包含：

| 组件 | 技术栈 | 端口 |
|------|--------|------|
| 后端 API 服务 | Node.js + Express + TypeScript | 3001 |
| 前端 Web 应用 | React 18 + Ant Design 5 + TypeScript (Vite) | 5173 |
| 数据库 | MySQL 8.0+ | 3306 |

## 🔧 环境要求

- **Node.js** >= 18.x（推荐 20+）
- **MySQL** >= 8.0
- **npm** 或 **pnpm** 包管理器
- **操作系统**：Windows / Linux / macOS

---

## 🚀 快速开始（5 步启动）

### 第一步：安装数据库

1. 确保 MySQL 已安装并启动
2. 创建数据库并导入 Schema：

```bash
mysql -u root -p < database/schema.sql
```

这将创建 `cad_audit_system` 数据库，包含所有表结构和初始数据。

**默认超级管理员账号：**
- 邮箱：`admin@cadaudit.com`
- 密码：`Admin@123456`
- ⚠️ 请在首次登录后立即修改密码！

### 第二步：配置后端

```bash
cd server

# 安装依赖
npm install

# 创建环境配置文件
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 必填项 - 根据你的实际环境修改
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=cad_audit_system

# JWT 密钥（生产环境请使用随机字符串！）
JWT_SECRET=change-this-to-a-random-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=another-random-string-for-refresh-tokens

# 前端地址
CORS_ORIGIN=http://localhost:5173
```

### 第三步：启动后端服务

```bash
cd server

# 开发模式启动（自动热重载）
npm run dev

# 或者编译后运行
# npm run build && npm start
```

看到以下输出表示启动成功：

```
╔════════════════════════════════════════════╗
║   CAD 文件规范审核系统 - 后端服务已启动     ║
║   地址: http://localhost:3001               ║
╚════════════════════════════════════════════╝
```

### 第四步：配置前端

```bash
cd client

# 安装依赖
npm install
```

前端已通过 Vite 配置了代理（`vite.config.ts`），开发模式下 API 请求会自动转发到后端。

### 第五步：启动前端

```bash
cd client

# 开发模式启动
npm dev
```

浏览器访问 `http://localhost:5173` 即可使用系统！

---

## 📁 项目结构

```
CAD test/
├── database/
│   └── schema.sql              # 数据库完整 Schema
├── server/                      # 后端 (Node.js)
│   ├── src/
│   │   ├── config/             # 配置中心、数据库连接
│   │   ├── controllers/        # 控制器层 (HTTP 处理)
│   │   ├── services/           # 业务逻辑层
│   │   ├── repositories/       # 数据访问层
│   │   ├── middleware/         # 中间件 (JWT, 上传, 错误处理)
│   │   ├── routes/             # 路由定义
│   │   ├── types/              # TypeScript 类型定义
│   │   └── utils/              # 工具函数 (错误类, 响应格式化)
│   ├── package.json
│   └── tsconfig.json
├── client/                      # 前端 (React)
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── components/        # 公共组件
│   │   ├── services/          # API 客户端 & Auth Context
│   │   ├── layouts/            # 布局组件
│   │   ├── types/              # 类型定义
│   │   ├── App.tsx             # 路由配置
│   │   └── main.tsx            # 入口
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── DEPLOYMENT.md           # 本文档
│   ├── API.md                  # API 接口文档
│   └── TEST.md                 # 测试用例说明
├── .env.example                # 后端环境变量示例
└── README.md                   # 项目说明
```

---

## 🔌 API 接口列表

### 认证相关
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| POST | `/api/auth/refresh` | 刷新 Token | 否 |
| POST | `/api/auth/logout` | 登出 | 是 |

### 用户
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/user/me` | 获取当前用户信息 | 是 |
| PUT | `/api/user/me` | 更新个人信息 | 是 |

### 积分与充值
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/points/info` | 积分余额和免费次数 | 是 |
| POST | `/api/points/recharge` | 充值积分 | 是 |
| GET | `/api/points/records` | 积分流水 | 是 |
| GET | `/api/points/recharges` | 充值记录 | 是 |

### CAD 审核
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/audit/upload` | 上传 CAD 文件审核 | 是 |
| GET | `/api/audit/history` | 审核历史列表 | 是 |
| GET | `/api/audit/:id` | 审核详情 | 是 |

### 企业管理
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/enterprise` | 创建企业 | 是(工作者) |
| GET | `/api/enterprise/my` | 我的企业 | 是 |
| GET | `/api/enterprise/:id` | 企业详情 | 管理员 |
| POST | `/api/enterprise/:id/employees/bind` | 绑定员工 | 管理员 |
| DELETE | `/api/enterprise/:id/employees/:uid` | 踢出员工 | 管理员 |
| PUT | `/api/enterprise/:id/employees/:uid/promote` | 提升为管理员 | 管理器 |
| POST | `/api/enterprise/:id/employees/register` | 直接注册员工 | 管理员 |
| POST | `/api/enterprise/:id/exchange-slots` | 兑换名额 | 管理员 |
| GET | `/api/enterprise/:id/employees` | 员工列表 | 管理员 |

### 任务管理
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/tasks` | 创建任务 | 管理员 |
| PUT | `/api/tasks/:id` | 更新任务 | 管理员 |
| DELETE | `/api/tasks/:id` | 删除任务 | 管理员 |
| GET | `/api/enterprise/:entId/tasks` | 企业任务列表 | 管理员 |
| GET | `/api/tasks/mine` | 我的任务 | 员工 |

### 广告
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/ads` | 所有有效广告 | 否 |
| GET | `/api/ads/position/:pos` | 按位置查广告 | 否 |
| POST | `/api/admin/ads` | 创建广告 | 超管 |
| PUT | `/api/admin/ads/:id` | 更新广告 | 超管 |
| DELETE | `/api/admin/ads/:id` | 删除广告 | 超管 |
| GET | `/api/admin/ads` | 广告管理列表 | 超管 |

### 超级管理员
| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/admin/users` | 用户列表 | 超管 |
| PATCH | `/api/admin/users/:id/status` | 启禁用户 | 超管 |
| POST | `/api/admin/users/:id/points` | 调整积分 | 超管 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/rules/preset` | 预设审核规则库 |

---

## 🛠 生产部署建议

### 1. 反向代理 (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 上传文件
    location /uploads {
        alias /path/to/server/uploads;
        expires 1h;
    }
}
```

### 2. 使用 PM2 管理 Node.js 进程

```bash
# 安装 PM2
npm install -g pm2

# 编译后端
cd server && npm run build

# 启动 PM2 进程
pm2 start dist/app.js --name cad-api --max-memory-restart 200M

# 设置开机自启
pm2 startup
pm2 save
```

### 3. 构建前端

```bash
cd client
npm run build
# 输出目录: dist/ → 部署到 Nginx 的 root 目录
```

### 4. 安全加固清单

- [ ] 修改 `.env` 中所有默认密钥
- [ ] 修改超级管理员默认密码
- [ ] 配置 HTTPS (Let's Encrypt)
- [ ] MySQL 只允许本地访问或配置防火墙
- [ ] 配置 Nginx rate limiting
- [ ] 定期备份数据库

---

## 🐳 Docker 部署（可选）

```dockerfile
# Dockerfile.server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx tsc
EXPOSE 3001
CMD ["node", "dist/app.js"]
```

```bash
# 构建并运行
docker build -t cad-api -f Dockerfile.server .
docker run -d --name cad-api -p 3001:3001 --env-file .env cad-api
```

---

## 💎 企业套餐系统（订阅功能）

### 功能概述

工作者注册企业时必须选择付费套餐并完成支付后，才能获得企业管理员权限。套餐到期后企业功能自动冻结（不可下发新任务、不可新增员工），但不影响已有数据查看。

### 三档套餐

| 套餐 | 年费 | 每日任务限额 | 特点 |
|------|------|-------------|------|
| **小型企业** | ¥288/年 | 20 次 | 基础管理，适合小团队 |
| **中型企业** | ¥588/年 | 50 次 | 更多额度，适合成长型企业 |
| **大型企业** | ¥1,088/年 | **无限制** | 全功能开放，适合大团队 |

> ⚠️ **重要**：初期免费 3 个直接注册员工名额**不受套餐影响**，始终有效。后续扩充名额仍需 10 积分/个，与套餐独立。

### 订单类型与计费规则

| 场景 | 说明 |
|------|------|
| **首次购买 (new)** | 选择任意套餐，支付全额年费，有效期 1 年 |
| **续费 (renew)** | 在原到期时间基础上延长 1 年，价格 = 当前套餐年费 |
| **升级 (upgrade)** | 补差价后重置 1 年周期。不支持降级 |

### 支付方式

- **模拟支付** (`mock`)：开发/测试用，直接标记为已支付
- **积分全额抵扣** (`points_only`)：1 积分 = 1 元
- **混合支付** (`points_cash`)：部分积分 + 部分现金

### 定时任务

系统每日凌晨 00:00:05 自动执行：
1. 重置所有企业的每日任务下发计数
2. 冻结已过期但未冻结的企业
3. 检测 7 天内到期的企业并输出提醒日志（可扩展接入邮件/短信通知）

### 冻结状态行为

| 功能 | 正常 | 已冻结 |
|------|------|--------|
| 查看企业信息 / 员工列表 | ✅ | ✅ |
| 查看审核历史 / 数据报表 | ✅ | ✅ |
| 下发新任务 | ✅ | ❌ |
| 绑定 / 注册新员工 | ✅ | ❌ |
| 兑换员工名额 | ✅ | ❌ |
| 续费 / 升级 | ✅ | ✅（解冻后恢复） |

### 新增 API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/subscription/tiers` | 获取可购买套餐列表 | 是 |
| GET | `/api/subscription/status` | 获取当前企业套餐状态 | 管理员 |
| GET | `/api/subscription/orders` | 获取企业订单列表 | 管理员 |
| POST | `/api/subscription/orders` | 创建订单(买/续费/升级) | 管理员 |
| POST | `/api/subscription/mock-pay` | 模拟支付(测试用) | 管理员 |
| GET | `/api/subscription/orders/:id` | 查询订单详情 | 是 |

---

## ❓ 常见问题

**Q: 启动报错 "Missing required env var"？**
A: 检查 `.env` 文件是否已创建且填写正确。确保 DB_PASSWORD 和 JWT_SECRET 已设置。

**Q: 连接数据库失败？**
A: 确认 MySQL 正在运行，检查 `.env` 中的 DB_HOST、DB_PORT、DB_USER、DB_PASSWORD 是否正确。
确认已执行 `database/schema.sql` 导入表结构。

**Q: CORS 错误？**
A: 检查 `.env` 中的 `CORS_ORIGIN` 是否与前端访问地址一致（如 `http://localhost:5173`）。

**Q: 文件上传失败？**
A: 检查 `uploads/` 目录是否存在且有写入权限。后端启动时会自动创建子目录。

**Q: 企业套餐到期后数据会丢失吗？**
A: 不会。套餐到期后企业进入"冻结"状态，已有数据（员工、任务、审核记录等）均可正常查看。只需续费即可恢复全部功能。

**Q: 升级套餐时如何计费？**
A: 升级按差价计算：新套餐全价 - 当前套餐未消费部分 = 应补金额。补款后重置为新的 1 年周期。

---

*文档版本: 1.1 | 最后更新: 2026-05-29（新增企业套餐系统）*
