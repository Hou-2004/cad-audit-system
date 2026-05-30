# CAD 文件规范审核系统 - 测试文档

## 🧪 测试策略

### 测试层级

| 层级 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Jest + Supertest | Services, Repositories |
| 集成测试 | Supertest | API 端点 |
| E2E 测试 | Playwright / Cypress | 用户流程 |

---

## 🔬 基础 API 测试用例

### 准备工作

```bash
# 1. 确保数据库已初始化
mysql -u root -p < database/schema.sql

# 2. 启动后端服务（另一个终端）
cd server && npm run dev

# 3. 使用 curl 或 Postman 执行以下测试
```

---

### 1. 健康检查

```bash
# GET /health - 应返回 200
curl http://localhost:3001/health

# 预期响应:
{
  "status": "ok",
  "timestamp": "2026-05-29T08:30:00.000Z",
  "version": "1.0.0"
}
```

**验证点：**
- [x] HTTP 状态码为 200
- [x] 返回 JSON 格式
- [x] status 字段为 "ok"

---

### 2. 用户注册

```bash
# POST /api/auth/register - 注册新用户
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "测试用户",
    "password": "Test123456"
  }'

# 预期响应 (201):
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "user": { "id": 2, "email": "testuser@example.com", "username": "测试用户", "role": "worker", ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}

# 边界测试:
# - 重复邮箱 → 400 "该邮箱已被注册"
# - 密码少于6位 → 400 "密码至少6位"
# - 邮箱格式错误 → 400 "请输入有效的邮箱地址"
```

**验证点：**
- [x] 正确信息返回 201 + Token
- [x] 重复邮箱返回 400
- [x] 无效密码长度返回 400

---

### 3. 用户登录

```bash
# POST /api/auth/login - 使用邮箱登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account": "testuser@example.com", "password": "Test123456"}'

# 预期响应 (200):
{ "code": 200, "message": "登录成功", "data": { "user": {...}, "accessToken": "...", "refreshToken": "..." } }

# 使用手机号登录（如果已绑定手机）
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account": "13800138000", "password": "Test123456"}'

# 错误密码 → 401 "账号或密码错误"
# 不存在的账号 → 401 "账号或密码错误"

# 登录超管账号
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account": "admin@cadaudit.com", "password": "Admin@123456"}'
```

**验证点：**
- [x] 正确凭证返回 Token 对
- [x] 错误密码返回 401
- [x] 不存在账号返回 401
- [x] 超管账号可正常登录

---

### 4. JWT 认证保护

```bash
# 获取 Token (从登录接口)
TOKEN="你的accessToken"

# 无 Token 访问受保护接口 → 401
curl http://localhost:3001/api/user/me
# 预期: { "code": 401, "message": "缺少认证令牌" }

# 带 Token 访问 → 200
curl http://localhost:3001/api/user/me \
  -H "Authorization: Bearer $TOKEN"
# 预期: { "code": 200, "data": { "id": ..., "email": ..., ... } }

# 过期的/伪造的 Token → 401
curl http://localhost:3001/api/user/me \
  -H "Authorization: Bearer invalid.token.here"
# 预期: { "code": 401, "message": "无效的认证令牌" }
```

**验证点：**
- [x] 无 Token → 401
- [x] 有效 Token → 200 + 用户数据
- [x] 无效 Token → 401

---

### 5. 积分查询

```bash
TOKEN="你的accessToken"

# 查询积分信息
curl http://localhost:3001/api/points/info \
  -H "Authorization: Bearer $TOKEN"

# 预期响应:
{
  "code": 200,
  "data": {
    "balance": 0,
    "freeAuditDaily": 5,
    "freeAuditUsed": 0,
    "freeAuditRemaining": 5
  }
}
```

**验证点：**
- [x] 新用户默认每日5次免费审核
- [x] 默认积分为0

---

### 6. 充值（模拟支付）

```bash
TOKEN="你的accessToken"

# 充值10元 = 10积分
curl -X POST http://localhost:3001/api/points/recharge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "payment_method": "mock"}'

# 预期响应 (200):
{
  "code": 200,
  "message": "充值成功",
  "data": {
    "id": 1,
    "user_id": 2,
    "amount": 10.00,
    "points_granted": 10,
    "status": "paid",
    "trade_no": "MOCK_..."
  }
}

# 再次查询余额确认到账
curl http://localhost:3001/api/points/info \
  -H "Authorization: Bearer $TOKEN"
# balance 应为 10
```

**验证点：**
- [x] 模拟支付成功，状态为 paid
- [x] 积分正确入账
- [x] 充值记录可查

---

### 7. 企业创建

```bash
TOKEN="普通用户token"

# 创建企业
curl -X POST http://localhost:3001/api/enterprise \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "测试科技有限公司", "description": "CAD审核测试企业"}'

# 预期: 201, data 包含企业信息
# 同时用户角色应自动变为 enterprise_admin

# 重复创建 → 400 "您已创建过企业"

# 查询我的企业
curl http://localhost:3001/api/enterprise/my \
  -H "Authorization: Bearer $TOKEN"
```

**验证点：**
- [x] 首次创建成功 (201)
- [x] 角色自动升级为 enterprise_admin
- [x] 重复创建被拒绝 (400)

---

### 8. CAD 文件审核

```bash
TOKEN="工作者token"

# 上传 DXF 文件进行审核
curl -X POST http://localhost:3001/api/audit/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'file=@test.dxf' \
  -F 'spec_requirements={"check_layers": true}'

# 预期响应 (200):
{
  "code": 200,
  "message": "审核完成",
  "data": {
    "recordId": 1,
    "auditResult": {
      "summary": { "total": 6, "passed": 4, "failed": 1, "warning": 1 },
      "items": [...],
      "score": 78,
      "overallStatus": "failed"
    }
  }
}

# 查询审核历史
curl "http://localhost:3001/api/audit/history?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# 查看审核详情
curl http://localhost:3001/api/audit/1 \
  -H "Authorization: Bearer $TOKEN"
```

**验证点：**
- [x] DXF 文件上传并解析成功
- [x] 返回完整的审核结果（含各项检查详情）
- [x] 审核记录持久化存储
- [x] 历史列表可查询
- [x] 详情页展示完整报告

---

### 9. 广告系统

```bash
# 公开接口 - 获取广告（无需登录）
curl http://localhost:3001/api/ads
# 预期: 返回各位置的有效广告列表

# 按位置获取
curl http://localhost:3001/api/ads/position/homepage_banner

# 记录点击
curl -X POST http://localhost:3001/api/ads/1/click
```

---

### 10. 权限校验

```bash
ADMIN_TOKEN="超管token"
WORKER_TOKEN="工作者token"

# 普通用户访问超管接口 → 403
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $WORKER_TOKEN"
# 预期: { "code": 403, "message": "需要 super_admin 权限" }

# 超管访问 → 200
curl http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# 预期: 200, 返回用户列表

# 企业管理员操作其他企业的员工 → 403
# （需两个不同企业管理员账号测试）

# 企业员工只能审核本企业任务文件
```

**验证点：**
- [x] 角色权限隔离正常
- [x] 跨企业操作被拒绝
- [x] 超管拥有全部管理权限

---

## 📊 自动化测试脚本示例

### 安装 Jest 测试框架

```bash
cd server
npm install --save-dev jest ts-jest supertest @types/supertest @types/jest
```

### `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
};
```

### `tests/health.test.ts` 示例

```typescript
import request from 'supertest';
import app from '../src/app';

describe('健康检查', () => {
  it('GET /health 应返回 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
  });
});

describe('用户认证', () => {
  it('POST /auth/register - 注册成功', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test_${Date.now()}@example.com`,
        username: '测试',
        password: 'Test123456'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/register - 重复邮箱', async () => {
    const email = `dup_${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ email, username: 'u1', password: 'Test123456' });
    const res = await request(app).post('/api/auth/register').send({ email, username: 'u2', password: 'Test123456' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /user/me - 无Token 返回401', async () => {
    const res = await request(app).get('/api/user/me');
    expect(res.status).toBe(401);
  });
});
```

运行测试：
```bash
cd server && npx jest
```

---

## ✅ 核心功能测试清单

### 用户模块
- [ ] 注册（邮箱/手机号）
- [ ] 登录（邮箱/手机号）
- [ ] Token 刷新
- [ ] 登出
- [ ] 个人信息查看/修改
- [ ] 密码加密存储（bcrypt）
- [ ] 角色权限隔离

### 企业模块
- [ ] 创建企业
- [ ] 绑定已有用户
- [ ] 直接注册员工
- [ ] 踢出员工
- [ ] 提升管理员
- [ ] 兑换名额
- [ ] 员工列表
- [ ] 跨企业操作拦截

### CAD 审核
- [ ] DWG/DXF 文件上传
- [ ] 图层规范检查
- [ ] 线型规范检查
- [ ] 颜色规范检查
- [ ] 尺寸标注检查
- [ ] 文字样式检查
- [ ] 图框规范检查
- [ ] 审核结果评分
- [ ] 报告生成与下载
- [ ] 审核历史查询

### 积分系统
- [ ] 充值（模拟支付）
- [ ] 积分余额查询
- [ ] 兑换审核次数
- [ ] 兑换员工名额
- [ ] 积分流水记录
- [ ] 每日免费次数重置
- [ ] 余额不足提示

### 广告系统
- [ ] 按位置展示
- [ ] 有效期控制
- [ ] 点击计数
- [ ] CRUD 管理（超管）

### 安全性
- [ ] JWT 认证
- [ ] RBAC 权限控制
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF 防护
- [ ] 速率限制
- [ ] 文件上传安全

---

*文档版本: 1.0 | 最后更新: 2026-05-29*
