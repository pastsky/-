# 物业公司运维工单管理平台 · 前端

物业公司运维工单管理平台的前端项目，覆盖工单全生命周期、用户管理、统计报表三大模块。前后端分离开发，通过接口契约（开发规范 + OpenAPI）解耦。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Vue 3 + Vite |
| UI | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| HTTP | Axios（统一封装于 `src/utils/request.js`） |
| 图表 | ECharts |
| 本地 Mock | vite-plugin-mock |

## 环境要求

- Node.js 18+（推荐 18 / 20 LTS）
- npm

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/pastsky/-.git
cd -

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 Mock 模式）
npm run dev
```

浏览器打开 http://localhost:5173

## 测试账号（密码均为 123456）

| 账号 | 角色 | 说明 |
| --- | --- | --- |
| `admin` | 管理员 | 全部功能 |
| `cs001` | 客服 | 派单、关闭、统计报表 |
| `engineer001` / `engineer002` | 维修工 | 接单、完工 |
| `resident001` / `resident002` | 业主 | 报修、评价 |

## 两种运行模式

### 1. Mock 模式（默认）

前端内置本地 Mock，拦截 `/api` 请求返回模拟数据，**不依赖后端即可运行**。适合单独查看页面与交互效果。

### 2. 联调真实后端

后端服务就绪并运行在 `8080` 端口后，将 `vite.config.js` 中 Mock 关闭：

```js
viteMockServe({
  mockPath: 'mock',
  enable: false   // 改为 false，然后重启 npm run dev
})
```

关闭后前端会把 `/api` 代理到 `http://localhost:8080`，走后端真实接口。

## 目录结构

```
property-workorder-frontend/
├── mock/                      # 本地 Mock 数据与接口
├── src/
│   ├── api/                   # 接口请求，按模块拆分
│   ├── assets/                # 静态资源
│   ├── components/            # 公共组件
│   ├── layouts/               # 布局（侧边栏、顶栏）
│   ├── router/                # 路由（含登录与角色权限守卫）
│   ├── stores/                # Pinia 状态
│   ├── utils/
│   │   ├── request.js         # Axios 封装（拦截器、token、统一错误处理）
│   │   ├── auth.js            # token 存取
│   │   └── dict.js            # 业务枚举中文映射与展示配置
│   ├── views/                 # 页面
│   │   ├── login/             # 登录
│   │   ├── workOrder/         # 工单（列表/详情/创建编辑）
│   │   ├── user/              # 用户管理
│   │   └── stats/             # 统计报表
│   ├── App.vue
│   └── main.js
├── .env.development           # VITE_API_BASE_URL=/api
├── .env.production
├── vite.config.js             # 含 /api 代理与 Mock 开关
└── package.json
```

## 接口契约

前后端交互以接口契约为准，JSON 字段统一 camelCase，统一响应结构 `{ code, message, data }`，鉴权用 `Authorization: Bearer <token>`。

- 完整接口定义见 [docs/运维工单平台前后端开发规范.md](docs/运维工单平台前后端开发规范.md)（数据模型见第 5 节、接口清单见第 6 节）
- 可导入 Apifox 的 OpenAPI 文件见 [docs/property-workorder-openapi.json](docs/property-workorder-openapi.json)

## 构建与部署

```bash
# 生产构建
npm run build     # 产物输出到 dist/
```

生产环境由 Nginx 托管 `dist/` 静态文件，并将 `/api` 反向代理到后端服务。
