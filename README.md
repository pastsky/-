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
# 1. 克隆仓库（仓库名为 -，这里显式指定目录名，避免 cd - 变成切回上一个目录）
git clone https://github.com/pastsky/-.git property-workorder-frontend
cd property-workorder-frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器（默认 Mock 模式）
npm run dev
```

浏览器打开 http://localhost:5173

## 测试账号（密码均为 123456）

| 账号 | 角色 | 说明 |
| --- | --- | --- |
| `admin` | 平台管理员 | 全部功能 |
| `cs001` | 客服 | 客服工作台、派单/入池、回访、广播、统计报表 |
| `branch001` | 分公司管理员 | 工作台、批量操作、用户只读 |
| `vendor001` | 乙方管理员 | 合同范围内工单与报表 |
| `engineer001` / `engineer002` | 维修工 | 抢单、接单、完工、维修日历 |
| `vendoreng001` | 乙方检修员 | 同上，用于演示外委人员 |
| `resident001` / `resident002` | 业主 | 报修、预约时间、评价 |

> `engineer001` 名下已有在途工单，抢单会被「在途」校验拦截；使用 `vendoreng001` 演示抢单成功。

## 功能模块

| 页面 | 角色 | 说明 |
| --- | --- | --- |
| 客服工作台 | 管理端角色 | 待办聚合、逾期/超时聚合栏、待回访、池中待抢 |
| 工单管理 | 全部 | 状态/类型/优先级/池状态/日期筛选、紧急置顶、批量入池与取消 |
| 工单详情 | 全部 | 派单（持证/值班/在途/今日单量/超时率面板）、退回（说明）、转交、接单、完工（图片必填）、完工驳回、回访、兜底改单、内部备注、流转记录 |
| 工单池 | 维修工 / 管理端只读 | 本组优先排序、4h 超时标记、缺证置灰、抢单并发校验（在途/持证/值班/预约冲突） |
| 维修日历 | 维修工 / 管理端只读 | 按 `startDate/endDate` 聚合工单/维保/巡检/值班，30 分钟刻度 |
| 广播中心 | 管理员 / 客服 | 按全员/角色/小区广播，回显送达人数 |
| 统计报表 | 管理端角色 | 11 项指标、趋势与类型分布、班组绩效、跳转导出中心 |
| 导出中心 | 管理端角色 | 6 类报表 × Excel/CSV/PDF/PNG，异步任务轮询与下载 |
| 电梯台账 | 管理端 / 维修工只读 | 增删改、三态、年检登记、超期红标、批量导入、档案三 tab |
| 班组管理 | 管理端 | 班组 CRUD、成员全量维护、审计日志查询 |
| 反馈工单 | 管理端 | 未处理置顶、详情与处理（处理说明必填） |
| 用户管理 | 管理员 / 分公司管理员 | 7 角色、班组、证书、逻辑停用与恢复 |

## 两种运行模式

### 1. Mock 模式（默认）

前端内置本地 Mock，拦截 `/api` 请求返回模拟数据，**不依赖后端即可运行**。适合单独查看页面与交互效果。

### 2. 联调真实后端

后端服务运行在 `8080` 端口后，用专门的联调命令启动（无需改代码）：

```bash
npm run dev:real
```

该命令读取 `.env.real`（`VITE_USE_MOCK=false`），关闭本地 Mock，前端把 `/api` 与 `/uploads` 都代理到 `http://localhost:8080`，走真实接口与真实图片。

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
├── .env.development           # Mock 模式：VITE_API_BASE_URL=/api
├── .env.real                  # 联调模式：VITE_USE_MOCK=false
├── .env.production
├── vite.config.js             # 含 /api、/uploads 代理与 Mock 开关
└── package.json
```

## 接口契约

前后端交互以接口契约为准，JSON 字段统一 camelCase，统一响应结构 `{ code, message, data }`，鉴权用 `Authorization: Bearer <token>`。

- 完整接口定义见 [docs/运维工单平台前后端开发规范.md](docs/运维工单平台前后端开发规范.md)（数据模型见第 5 节、接口清单见第 6 节）
- 可导入 Apifox 的 OpenAPI 文件见 [docs/property-workorder-openapi.json](docs/property-workorder-openapi.json)

## 增量接口（对齐后端契约 v1.2）

| 接口 | 说明 |
| --- | --- |
| `GET /api/work-orders/pool` | 待抢单池，`show_all=true` 取消本组优先排序 |
| `POST /api/work-orders/{id}/grab` | 抢单：`PENDING + pool_flag=1 → PROCESSING` |
| `POST /api/work-orders/{id}/to-pool` | 推送入池（`reason` 必填） |
| `POST /api/work-orders/{id}/return` | 维修工退回（仅 `remark`，回 `PENDING`） |
| `POST /api/work-orders/{id}/transfer` | 转交（`targetAssigneeId` + `reason`） |
| `POST /api/work-orders/{id}/reject` | 完工驳回，回 `PROCESSING`，上限 3 次 |
| `POST /api/work-orders/{id}/review` | 回访结果 `SATISFIED` / `UNSATISFIED` |
| `POST /api/work-orders/{id}/force-status` | 兜底改单，仅 3 对状态 |
| `POST /api/work-orders/{id}/internal-notes` | 内部备注（`remark` + `images` ≤3） |
| `POST /api/work-orders/{id}/audit-appointment` | 审核预约（通过/改约） |
| `POST /api/work-orders/batch-assign` · `batch-to-pool` · `batch-cancel` | 批量操作，返回 `successCount/failureCount/failures` |
| `GET /api/work-orders/global-search` | 全局搜索（单号/业主/电话/电梯） |
| `GET /api/engineers/{id}/calendar` | 维修日历，`startDate/endDate`（≤31 天）+ `types` |
| `GET /api/cs-workbench/todos` · `/overdue` | 客服工作台待办计数与逾期聚合 |
| `GET /api/appointments/change-limit` · `/release` · `/duty-availability` | 改约频控与值班可用性 |
| `GET/POST/PUT/DELETE /api/elevators` · `/import` · `/{id}/inspect` · `/{id}/profile` | 电梯台账、批量导入、年检、档案聚合 |
| `GET/POST/PUT/DELETE /api/teams` · `/{id}/members` · `GET /api/audit-logs` | 班组与审计日志 |
| `GET /api/feedback` · `/{id}` · `PUT /{id}/resolve` | 反馈工单闭环 |
| `POST/GET /api/exports` · `/{id}` · `/{id}/download` · `GET /api/stats/team-performance` | 异步导出中心与班组统计 |

> 契约来源：后端交付的 `PR-006-contract-baseline.md`（v1.0）、`PR-012-022-contract-baseline.md`（v1.1）、`contract-v1.2-changelog.md`（v1.2）。未实现页面（证书审核、巡检、维保计划/任务）的接口已在契约中登记，待排期。

## 契约对齐决议

### 1. 抢单状态机：`PENDING → PROCESSING`（定版，与后端实现一致）

主方案 Q1 与生命周期归档对抢单出口存在冲突（`PROCESSING` vs `ASSIGNED`）。后端 PR-009/PR-021 已按 **`PENDING + pool_flag=1 → PROCESSING`** 交付并写入 `accept_time`，前端已对齐：

- 抢单成功即进入「处理中」，无需再接单；
- 抢单前置校验（在途/持证/值班/预约冲突）失败统一返回 `1002`（无权限/收工）或 `3000`（已被抢/在途/冲突），前端按码提示；
- `ASSIGNED → PROCESSING` 的 `ACCEPT` 仍用于**派单**场景，两条路径并存但互不混用。

### 2. 完工照片：必填（`images` 1~6 张）

需求 FR-WO-08 与生命周期归档均要求「维修工完工必须上传现场照片，业主可见」，后端 PR-019 已实现必填校验，前端同步强制：

- `POST /api/work-orders/{id}/complete`：`images` 必填 1~6 张、`remark` 可选；缺失返回 `1000`；
- 详情返回 `finishImages`、`finishRemark`；业主可见，客服驳回时据此判断；
- 契约文件已同步：[docs/property-workorder-openapi.json](docs/property-workorder-openapi.json)。

## 端到端测试

```bash
npm run test:e2e        # 12 条 Playwright 用例，自动拉起 dev server
npm run test:e2e:report # 查看 HTML 报告
```

覆盖：登录与数据范围、动态表单与预约时间、派单面板、接单与完工必传图片、回访归档、抢单在途校验、维修日历、客服工作台、广播、统计与异步导出、用户停用/恢复、路由守卫。

## 构建与部署

```bash
# 生产构建
npm run build     # 产物输出到 dist/
```

生产环境由 Nginx 托管 `dist/` 静态文件，并将 `/api` 反向代理到后端服务。
