FROM node:18-alpine

WORKDIR /app

# 复制依赖定义文件
COPY package.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制所有项目代码（包括预编译的 client/dist 和 server/dist）
COPY . .

# 暴露端口（Koyeb 会通过 PORT 环境变量覆盖）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# 启动应用（serve.js 自动读取 PORT 环境变量）
CMD ["npm", "start"]
