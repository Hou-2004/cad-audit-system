# 📐 CAD 文件规范审核系统

> 一个完整的企业级 CAD 文件规范审核平台，支持用户管理、企业团队协作、自动审核引擎、积分支付和广告系统。

## ✨ 功能特性

### 🔐 用户与权限
- **三种角色**：普通工作者、企业管理员、超级管理员
- **注册/登录**：邮箱或手机号，JWT 双 Token 鉴权
- **企业创建**：工作者可注册企业并成为管理员

### 🏢 企业管理
- **员工管理**：绑定已有用户 / 直接注册 / 提升管理员 / 移除员工
- **名额体系**：初始3个免费名额，10积分兑换1个额外名额
- **任务下发**：向员工分配审核任务（含CAD规范要求）

### 📐 CAD 文件审核核心
- **多格式支持**：DWG / DXF 解析
- **6大审核维度**：
  - 图层命名规范检查
  - 线型合规性验证
  - 颜色按图层匹配
  - 尺寸标注样式校验
  - 文字字体/高度检测
  - 图框标题栏完整性检查
- **智能评分**：0-100 分制，逐项标注通过/不通过/警告
- **报告导出**：详细的审核结果报告

### 💰 积分与充值
- **充值**：1元 = 1积分（支持模拟/支付宝/微信）
- **兑换**：1积分=1次审核 | 10积分=1个员工名额
- **免费次数**：每日5次自动重置（凌晨0点）
- **企业特权**：直属员工无限次不消耗积分

### 📢 广告位系统
- **4个位置**：首页横幅、侧边栏、仪表盘顶部、插屏
- **有效期控制**：开始/结束时间
- **数据统计**：展示量 + 点击量

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Ant Design 5 + TypeScript + Vite |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MySQL 8.0+ (12张表) |
| 认证 | JWT Access + Refresh Token |
| 文件上传 | Multer (支持大文件分片) |
| 数据验证 | Zod Schema |
| 状态管理 | React Query |

## 🚀 快速启动

```bash
# 1. 初始化数据库
mysql -u root -p < database/schema.sql

# 2. 启动后端
cd server && npm install && cp .env.example .env
# 编辑 .env 配置数据库连接和 JWT 密钥
npm run dev   # → http://localhost:3001

# 3. 启动前端
cd client && npm install && npm dev  # → http://localhost:5173
```

### 默认测试账号
- 超管: `admin@cadaudit.com` / `Admin@123456`

## 📁 项目结构

```
├── server/          # 后端 API 服务
│   └── src/
│       ├── config/     # 配置 & 数据库
│       ├── controllers/ # HTTP 控制器
│       ├── services/    # 业务逻辑
│       ├── repositories/# 数据访问
│       ├── middleware/  # 中间件
│       ├── routes/      # 路由
│       └── types/       # 类型定义
├── client/          # React 前端应用
│   └── src/
│       ├── pages/      # 页面组件
│       ├── services/   # API & Auth
│       ├── layouts/    # 布局
│       └── types/      # 类型
├── database/        # SQL Schema
└── docs/            # 部署文档 & 测试用例
```

## 📖 详细文档

- [部署指南](docs/DEPLOYMENT.md) — 环境配置、生产部署、Docker
- [测试文档](docs/TEST.md) — API 测试用例、自动化测试示例

## 📄 License

MIT License © 2026
