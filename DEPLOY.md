# AI Knowledge Explorer 部署文档

## 环境要求

- Node.js >= 18
- npm >= 9
- OpenAI API Key（需要能访问 `gpt-4o` 模型）

## 项目结构

```
ai-knowledge-explorer/
├── client/          # React 前端（Vite 构建）
├── server/          # Express 后端 + SQLite
├── package.json     # 工作区根配置
└── knowledge.db     # 运行时自动生成的 SQLite 数据库
```

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
#    创建 .env 文件或直接 export
export OPENAI_API_KEY=your-api-key-here

# 3. 启动开发服务器
#    前端（端口 3000，代理 API 到 3001）
cd client && npm run dev

#    后端（端口 3000，或通过 PORT 环境变量指定）
cd server && npm run dev
```

开发模式下，前端 Vite 会将 `/api` 请求代理到 `http://localhost:3001`，所以后端开发时建议用 `PORT=3001` 启动。

## 生产部署

### 1. 构建

```bash
# 安装所有依赖
npm install

# 构建前端静态文件
cd client
npm run build
cd ..

# 构建后端 TypeScript
cd server
npm run build
cd ..
```

构建产物：
- 前端：`client/dist/`（静态 HTML/JS/CSS）
- 后端：`server/dist/`（编译后的 JS）

### 2. 配置环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `OPENAI_API_KEY` | 是 | - | OpenAI API 密钥 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | 自定义 API 地址，兼容 OpenAI 接口的服务均可使用 |
| `OPENAI_MODEL` | 否 | `gpt-4o` | 使用的模型名称 |
| `PORT` | 否 | `3000` | 服务监听端口 |

### 3. 启动服务

```bash
export OPENAI_API_KEY=your-api-key-here
export PORT=3000

cd server
node dist/index.js
```

后端会同时提供 API 服务和前端静态文件（从 `client/dist/` 目录），所以只需要启动一个进程。

### 4. 数据库

- 使用 SQLite（`better-sqlite3`），无需额外安装数据库服务
- 数据库文件 `knowledge.db` 在项目根目录自动创建
- 启动时自动建表，无需手动迁移
- 备份只需复制 `knowledge.db` 文件即可

## 使用 PM2 部署（推荐）

```bash
npm install -g pm2

# 启动
pm2 start server/dist/index.js --name ai-knowledge-explorer \
  --env PORT=3000 \
  --env OPENAI_API_KEY=your-api-key-here

# 常用命令
pm2 status                    # 查看状态
pm2 logs ai-knowledge-explorer # 查看日志
pm2 restart ai-knowledge-explorer
pm2 stop ai-knowledge-explorer

# 开机自启
pm2 startup
pm2 save
```

## 使用 Docker 部署

项目根目录已包含 `Dockerfile`，直接构建即可：

```bash
# 构建镜像
docker build -t ai-knowledge-explorer .

# 运行
docker run -d \
  --name ai-knowledge-explorer \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your-api-key-here \
  -v $(pwd)/data:/app/knowledge.db \
  ai-knowledge-explorer
```

> 注意：如果需要持久化数据库，将 `knowledge.db` 挂载到宿主机目录。

## Nginx 反向代理（可选）

如果需要通过域名访问或配置 HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 注意事项

- `OPENAI_API_KEY` 不要提交到代码仓库，`.env` 已在 `.gitignore` 中
- SQLite 适合中小规模使用，高并发场景建议考虑迁移到 PostgreSQL
- `better-sqlite3` 是原生模块，Docker 构建时需要确保基础镜像包含编译工具链（`node:18-alpine` 已包含）
- 生产环境建议定期备份 `knowledge.db` 文件
