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
| 工单详情 | 全部 | 派单（持证/值班/在途/今日单量/超时率面板）、退回二选一、转交、接单、完工（图片必填）、完工驳回、回访、评价、内部备注、流转记录 |
| 工单池 | 维修工 / 管理端只读 | 本组优先排序、4h 超时标记、抢单 5 类校验（数据权限/无证/值班外/在途/预约冲突） |
| 维修日历 | 维修工 / 管理端只读 | 按接单→完工时间段渲染，30 分钟刻度，点击进入工单 |
| 广播中心 | 管理员 / 客服 | 按全员/角色/小区广播，回显送达人数 |
| 统计报表 | 管理端角色 | 11 项指标、趋势与类型分布、班组绩效、异步导出（Excel/CSV/PDF/PNG） |
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

## 增量接口（v1.0 设计，Mock 已实现）

| 接口 | 说明 |
| --- | --- |
| `GET /api/work-orders/pool` | 待抢单池，`show_all=true` 取消本组优先排序 |
| `POST /api/work-orders/{id}/grab` | 抢单，失败按 5 类原因返回 `1002/3002/3003/3004/3005` |
| `POST /api/work-orders/{id}/reassign-to-pool` | 推送入池（原因必填） |
| `POST /api/work-orders/{id}/transfer` | 转交（目标人同校验，原因必填） |
| `POST /api/work-orders/{id}/reject` | 完工驳回，回处理中，最多 3 次 |
| `POST /api/work-orders/{id}/review` | 回访结果 `SATISFIED` / `UNSATISFIED` |
| `POST /api/work-orders/{id}/audit-appointment` | 审核预约（通过/改约） |
| `GET /api/work-orders/calendar` | 维修日历，按 `month`、`repairerId` 聚合 |
| `POST /api/work-orders/{id}/remarks` | 内部备注（图片 ≤3 张） |
| `POST /api/work-orders/batch` | 批量入池/取消，逐单返回失败原因 |
| `POST /api/notifications/broadcast` | 广播，`targetScope` = `ALL/ROLE/BRANCH` |
| `GET /api/stats/workbench` | 工作台待办聚合计数 |

> 设计归档只给出了部分路径与字段，上表中工作台、日历、批量等为前端约定的探针路径，Mock 与之一致；联调前需与后端确认最终契约。工单状态新增 `PENDING_REVIEW`（待回访）与 `ESCALATED_FINAL`（升级终态）。

## 契约对齐决议

### 1. 抢单状态机：`PENDING → ASSIGNED`（定版）

两份归档口径冲突：主方案 Q1 写「抢单仍走 `PENDING → PROCESSING`」，生命周期归档的状态链是 `PENDING → ASSIGNED → PROCESSING`。**按生命周期归档执行**，理由：

- 生命周期归档是状态机的唯一完整定义（含 ACCEPT / RETURN / REJECT / 回访），后续 v3~v12 均以其为基线；
- 抢单与派单出口一致，避免同一工单存在「抢单直达处理中、派单需接单」两条语义；
- `ASSIGNED` 2h 未接自动回池的升级链对抢单同样生效；若直达 `PROCESSING`，该链对池单失效；
- `acceptTime` 保持「实际开工时间」口径，日历与工时统计才准确。

落地：`POST /api/work-orders/{id}/grab` 成功后返回 `status=ASSIGNED`，维修工需再调用 `accept` 才进入 `PROCESSING`；抢单并发校验（在途/持证/值班/预约冲突）仍在抢单前置执行。

### 2. 完工照片：必填（`images` 1~6 张）

需求 FR-WO-08 与生命周期归档均要求「维修工完工必须上传现场照片，业主可见」，而 v1.4 后端契约未包含该字段。**按需求执行必填**，并已把契约补齐：

- `POST /api/work-orders/{id}/complete` 请求体改为 `CompleteWorkOrderRequest`：`images` 必填（`minItems: 1`、`maxItems: 6`），`remark` 可选；
- 缺失图片时后端返回业务码 `1000`，前端在提交前也会拦截并提示；
- `WorkOrderDetailVO` 增加 `finishImages`、`finishRemark`、`poolFlag`、`appointmentTime`、`reviewResult` 字段；
- 契约文件已同步：[docs/property-workorder-openapi.json](docs/property-workorder-openapi.json)。

> 后端待办：`work_order` 表补 `finish_images`（逗号串或 JSON）、`finish_remark`；`complete` 接口加非空校验并落库；详情接口回传上述字段。

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
