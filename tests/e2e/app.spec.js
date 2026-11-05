import { test, expect } from '@playwright/test'
import {
  loginAs,
  selectOption,
  confirmBox,
  tableRow,
  lastMessage,
  TINY_PNG
} from './helpers'

// Mock 数据保存在 dev server 内存中，用例需串行执行
test.describe.configure({ mode: 'serial' })

const TITLE = `E2E测试-厨房水管漏水-${Date.now()}`
const NEW_USERNAME = `e2e_${Date.now()}`

test('登录校验与业主登录跳转', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('物业工单管理平台')).toBeVisible()

  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.locator('.el-message')).toContainText('请输入用户名和密码')

  await page.getByPlaceholder('用户名').fill('resident001')
  await page.getByPlaceholder('密码').fill('wrong-pass')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(lastMessage(page, 'error')).toContainText('用户名或密码错误')

  await page.getByPlaceholder('密码').fill('123456')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/\/work-orders$/)
  await expect(page.locator('.username')).toHaveText('张三')
  await expect(page.locator('.el-table__body-wrapper')).toBeVisible()
})

test('业主数据范围、动态表单、预约时间与新建工单', async ({ page }) => {
  await loginAs(page, 'resident')

  const body = page.locator('.el-table__body-wrapper')
  await expect(body).toContainText('3栋2单元水管漏水')
  await expect(body).not.toContainText('5栋1单元停电')
  await expect(body).not.toContainText('地下车库门禁故障')

  await page.getByRole('button', { name: '新建工单' }).click()
  await page.waitForURL(/\/work-orders\/create$/)

  // 业主优先级仅 低/中
  await page.locator('.el-form-item').filter({ hasText: '优先级' }).locator('.el-select').click()
  await expect(page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^紧急$/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByPlaceholder('请输入工单标题').fill(TITLE)
  await selectOption(page, '类型', '水')
  await selectOption(page, '优先级', '中')
  await page.getByPlaceholder('楼栋，如 3栋').fill('3栋')
  await page.getByPlaceholder('房号，如 2单元501').fill('2单元501')

  // 预约时间：无值班日期被禁用，选择 11-02（有值班）
  await page.getByPlaceholder('选择日期（可留空）').click()
  await page.locator('.el-picker-panel').getByText('2', { exact: true }).first().click()
  await page
    .locator('.el-form-item')
    .filter({ hasText: '预约时间' })
    .locator('.el-select')
    .click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '10:00' }).first().click()

  await page.getByPlaceholder('请描述问题').fill('自动化测试创建的工单')
  await page.getByRole('button', { name: '保存' }).click()

  await expect(lastMessage(page)).toContainText('创建成功')
  await page.waitForURL(/\/work-orders$/)
  await expect(tableRow(page, TITLE)).toContainText('待派单')
})

test('客服派单：候选面板展示持证/在途/今日单量', async ({ page }) => {
  await loginAs(page, 'cs')

  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  await page.getByRole('button', { name: '派单', exact: true }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '班组' }).last()
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('持证')
  await expect(dialog).toContainText('在途')
  await expect(dialog).toContainText('超时率')

  await dialog.locator('.el-table__body-wrapper tr').filter({ hasText: '外委赵师傅' }).first().click()
  await dialog.getByRole('button', { name: '确定' }).click()

  await expect(lastMessage(page)).toContainText('派单成功')
  await expect(page.locator('.el-card').first()).toContainText('待接单')
})

test('维修工接单、完工必须上传图片', async ({ page }) => {
  await loginAs(page, 'vendorEngineer')

  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  await page.getByRole('button', { name: '接单', exact: true }).click()
  await confirmBox(page)
  await expect(lastMessage(page)).toContainText('已接单')
  await expect(page.locator('.el-card').first()).toContainText('处理中')

  await page.getByRole('button', { name: '完工', exact: true }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '现场照片' }).last()
  await expect(dialog).toBeVisible()

  // 未上传直接提交 -> 拦截
  await dialog.getByRole('button', { name: '提交完工' }).click()
  await expect(lastMessage(page, 'warning')).toContainText('至少上传 1 张')

  await dialog.locator('input[type=file]').setInputFiles({
    name: 'site.png',
    mimeType: 'image/png',
    buffer: TINY_PNG
  })
  await expect(dialog.locator('.el-upload-list__item').first()).toBeVisible()
  await dialog.getByPlaceholder('说明处理结果').fill('已更换水管接口')
  await dialog.getByRole('button', { name: '提交完工' }).click()

  await expect(lastMessage(page)).toContainText('已完工')
  await expect(page.locator('.el-card').first()).toContainText('待回访')
})

test('客服回访满意后归档', async ({ page }) => {
  await loginAs(page, 'cs')

  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  await page.getByRole('button', { name: '回访', exact: true }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '回访结果' }).last()
  await dialog.locator('.el-radio', { hasText: '满意，归档' }).click()
  await dialog.getByRole('button', { name: '提交' }).click()

  await expect(lastMessage(page)).toContainText('回访完成')
  await expect(page.locator('.el-card').first()).toContainText('已关闭')
})

test('工单池抢单：在途校验与抢单成功', async ({ page }) => {
  // 李师傅名下已有在途工单，抢单应被拒
  await loginAs(page, 'engineer')
  await page.getByRole('menuitem', { name: '工单池' }).click()
  await page.waitForURL(/\/work-orders\/pool$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('3栋2单元水管漏水')

  await tableRow(page, '3栋2单元水管漏水').getByRole('button', { name: '抢单' }).click()
  await confirmBox(page)
  await expect(lastMessage(page, 'error')).toContainText('在途')

  // 空闲的外委赵师傅可抢
  await loginAs(page, 'vendorEngineer')
  await page.getByRole('menuitem', { name: '工单池' }).click()
  await page.waitForURL(/\/work-orders\/pool$/)
  await tableRow(page, '3栋2单元水管漏水').getByRole('button', { name: '抢单' }).click()
  await confirmBox(page)
  await expect(lastMessage(page)).toContainText('抢单成功')

  // 契约（PR-009）：抢单 PENDING+pool_flag=1 -> PROCESSING，并写入 accept_time
  await page.getByRole('menuitem', { name: '工单管理' }).click()
  await page.getByPlaceholder('工单号 / 标题').fill('3栋2单元水管漏水')
  await page.getByRole('button', { name: '查询' }).click()
  const grabbedRow = tableRow(page, '3栋2单元水管漏水')
  await expect(grabbedRow).toContainText('处理中')
  await expect(grabbedRow).not.toContainText('待接单')
})

test('维修日历按时间段展示工单', async ({ page }) => {
  await loginAs(page, 'engineer')
  await page.getByRole('menuitem', { name: '维修日历' }).click()
  await page.waitForURL(/\/calendar$/)

  await expect(page.locator('.metric').first()).toBeVisible()
  await expect(page.locator('.day-row').first()).toBeVisible()
  await expect(page.locator('.bar').first()).toBeVisible()
})

test('客服工作台聚合待办与超时', async ({ page }) => {
  await loginAs(page, 'cs')
  await page.getByRole('menuitem', { name: '客服工作台' }).click()
  await page.waitForURL(/\/dispatch$/)

  await expect(page.locator('.metric-card')).toHaveCount(9)
  await expect(page.getByText('逾期 / 超时聚合（按超时小时倒序）')).toBeVisible()
  await expect(page.locator('.el-table__body-wrapper').first()).toBeVisible()
})

test('广播中心按角色发布并回显送达人数', async ({ page }) => {
  await loginAs(page, 'cs')
  await page.getByRole('menuitem', { name: '广播中心' }).click()
  await page.waitForURL(/\/broadcast$/)

  await page.getByPlaceholder('如：11 月电梯年检安排').fill('E2E 广播测试')
  await page.getByPlaceholder('广播正文').fill('这是一条自动化测试广播')
  await page.locator('.el-radio', { hasText: '指定角色' }).click()
  await page.locator('.el-form-item').filter({ hasText: '目标角色' }).locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '维修工' }).first().click()
  await page.getByRole('button', { name: '发布' }).click()

  await expect(lastMessage(page)).toContainText('发布成功')
  await expect(page.locator('.el-table__body-wrapper')).toContainText('E2E 广播测试')
})

test('统计报表：指标卡、班组列与异步导出', async ({ page }) => {
  await loginAs(page, 'cs')
  await page.getByRole('menuitem', { name: '统计报表' }).click()
  await page.waitForURL(/\/stats$/)

  await expect(page.locator('.metric-card')).toHaveCount(11)
  await expect(page.locator('.chart canvas').first()).toBeVisible()
  await expect(page.getByText('维修工绩效')).toBeVisible()
  await expect(page.locator('.el-table__header-wrapper')).toContainText('班组')
  await expect(page.locator('.el-table__header-wrapper')).toContainText('超时率')
  await expect(page.locator('.el-table__body-wrapper')).toContainText('李师傅')

  await page.getByRole('button', { name: '打开导出中心' }).click()
  await page.waitForURL(/\/exports$/)
  await expect(page.getByText('创建导出任务')).toBeVisible()
})

test('管理员用户管理：新增、停用保护、停用与恢复', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.getByRole('menuitem', { name: '用户管理' }).click()
  await page.waitForURL(/\/users$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('admin')

  await page.getByRole('button', { name: '新增用户' }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '新增用户' }).last()
  await dialog.getByPlaceholder('登录账号').fill(NEW_USERNAME)
  await dialog.getByPlaceholder('初始密码').fill('123456')
  await dialog.getByPlaceholder('真实姓名').fill('E2E机器人')
  await dialog.locator('.el-form-item').filter({ hasText: '手机号' }).locator('input').fill('13900000000')
  await dialog.locator('.el-form-item').filter({ hasText: '地址' }).locator('input').first().fill('9栋')
  await dialog.locator('.el-form-item').filter({ hasText: '地址' }).locator('input').nth(1).fill('1单元101')
  await dialog.locator('.el-form-item').filter({ hasText: '角色' }).locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^业主$/ }).first().click()
  await dialog.getByRole('button', { name: '保存' }).click()

  await expect(lastMessage(page)).toContainText('新增成功')
  await expect(tableRow(page, NEW_USERNAME)).toContainText('业主')

  // 不能停用自己
  await tableRow(page, 'admin').getByRole('button', { name: '停用' }).click()
  await confirmBox(page)
  await expect(lastMessage(page, 'error')).toContainText('不能停用自己')

  // 停用无在途工单的用户 -> 逻辑删除
  await tableRow(page, NEW_USERNAME).getByRole('button', { name: '停用' }).click()
  await confirmBox(page)
  await expect(lastMessage(page)).toContainText('已停用')
  await expect(tableRow(page, NEW_USERNAME)).toContainText('停用')

  // 恢复
  await tableRow(page, NEW_USERNAME).getByRole('button', { name: '恢复' }).click()
  await expect(lastMessage(page)).toContainText('已恢复')
})

test('新增模块冒烟：电梯台账、班组、反馈、导出中心', async ({ page }) => {
  await loginAs(page, 'admin')

  // 电梯台账
  await page.getByRole('menuitem', { name: '电梯台账' }).click()
  await page.waitForURL(/\/elevators$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('JG-A1-01')
  await expect(page.locator('.el-table__body-wrapper')).toContainText('超期')

  // 班组 + 审计日志
  await page.getByRole('menuitem', { name: '班组管理' }).click()
  await page.waitForURL(/\/teams$/)
  await expect(page.locator('.el-table__body-wrapper').first()).toContainText('一班')
  await page.getByRole('tab', { name: '审计日志' }).click()
  await expect(page.getByText('业务类型')).toBeVisible()

  // 反馈工单
  await page.getByRole('menuitem', { name: '反馈工单' }).click()
  await page.waitForURL(/\/feedback$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('楼道还有残留水渍')
  await expect(page.locator('.el-table__body-wrapper')).toContainText('待处理')

  // 导出中心
  await page.getByRole('menuitem', { name: '导出中心' }).click()
  await page.waitForURL(/\/exports$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('EXP202610300001')
  await page.getByRole('button', { name: '提交导出' }).click()
  await expect(lastMessage(page)).toContainText('导出任务已提交')
})

test('新增模块交互：电梯新增、班组新增、反馈处理', async ({ page }) => {
  await loginAs(page, 'admin')

  // 电梯新增
  await page.getByRole('menuitem', { name: '电梯台账' }).click()
  await page.waitForURL(/\/elevators$/)
  await page.getByRole('button', { name: '新增电梯' }).click()
  const elevatorDialog = page.locator('.el-dialog').filter({ hasText: '新增电梯' }).last()
  await elevatorDialog.locator('.el-form-item').filter({ hasText: '楼栋' }).locator('input').fill('9栋')
  await elevatorDialog.locator('.el-form-item').filter({ hasText: '品牌' }).locator('input').fill('E2E品牌')
  await elevatorDialog.getByRole('button', { name: '保存' }).click()
  await expect(lastMessage(page)).toContainText('新增成功')
  await expect(page.locator('.el-table__body-wrapper')).toContainText('9栋')

  // 班组新增
  await page.getByRole('menuitem', { name: '班组管理' }).click()
  await page.waitForURL(/\/teams$/)
  await page.getByRole('button', { name: '新建班组' }).click()
  const teamDialog = page.locator('.el-dialog').filter({ hasText: '新建班组' }).last()
  await teamDialog.getByPlaceholder('唯一编码，如 T01').fill('T99')
  await teamDialog.locator('.el-form-item').filter({ hasText: '班组名称' }).locator('input').fill('E2E班组')
  await teamDialog.getByRole('button', { name: '保存' }).click()
  await expect(lastMessage(page)).toContainText('保存成功')
  await expect(page.locator('.el-table__body-wrapper').first()).toContainText('E2E班组')

  // 反馈处理
  await page.getByRole('menuitem', { name: '反馈工单' }).click()
  await page.waitForURL(/\/feedback$/)
  await tableRow(page, '楼道还有残留水渍').getByRole('button', { name: '处理' }).click()
  const feedbackDialog = page.locator('.el-dialog').filter({ hasText: '反馈详情' }).last()
  await feedbackDialog.getByPlaceholder('说明处理结果，必填').fill('已安排保洁返工')
  await feedbackDialog.getByRole('button', { name: '标记已处理' }).click()
  await expect(lastMessage(page)).toContainText('已标记处理')
  await expect(tableRow(page, '楼道还有残留水渍')).toContainText('已处理')
})

test('证书审核 / 巡检 / 维保模块', async ({ page }) => {
  await loginAs(page, 'cs')

  // 证书审核：待审证书优先，审核通过
  await page.getByRole('menuitem', { name: '证书审核' }).click()
  await page.waitForURL(/\/certificates$/)
  const certRow = tableRow(page, '消防设施操作员')
  await expect(certRow).toContainText('待审核')
  await certRow.getByRole('button', { name: '审核' }).click()
  const certDrawer = page.locator('.el-drawer').filter({ hasText: '审核留痕' }).last()
  await expect(certDrawer).toContainText('提交')
  await certDrawer.getByRole('button', { name: '通过' }).click()
  await expect(lastMessage(page)).toContainText('已通过')
  await expect(tableRow(page, '消防设施操作员')).toContainText('已通过')

  // 证书标签与类型映射
  await page.getByRole('tab', { name: '证书标签' }).click()
  await expect(page.locator('.el-tab-pane:visible .el-table__body-wrapper')).toContainText('LIFT_CERT')
  await page.getByRole('tab', { name: '工单类型映射' }).click()
  await expect(page.locator('.el-tab-pane:visible .el-table__body-wrapper')).toContainText('强制持证')

  // 维保计划与任务
  await page.getByRole('menuitem', { name: '维保计划' }).click()
  await page.waitForURL(/\/maintenance$/)
  await expect(page.locator('.el-tab-pane:visible .el-table__body-wrapper')).toContainText(
    '金桂园电梯季度维保'
  )
  await page.getByRole('tab', { name: '维保任务' }).click()
  const maintRow = tableRow(page, 'MT202610280001')
  await expect(maintRow).toContainText('已完工')
  await maintRow.getByRole('button', { name: '详情' }).click()
  const maintDrawer = page.locator('.el-drawer').filter({ hasText: '维保任务详情' }).last()
  await expect(maintDrawer).toContainText('季度维保')
  await maintDrawer.getByRole('button', { name: '确认' }).click()
  await expect(lastMessage(page)).toContainText('已确认')

  // 巡检：任务详情与驳回
  await page.getByRole('menuitem', { name: '巡检管理' }).click()
  await page.waitForURL(/\/inspection$/)
  await expect(page.locator('.el-tab-pane:visible .el-table__body-wrapper')).toContainText(
    '金桂园电梯月度巡检'
  )
  await page.getByRole('tab', { name: '巡检任务' }).click()
  await tableRow(page, 'IN202610300001').getByRole('button', { name: '详情' }).click()
  const inspDrawer = page.locator('.el-drawer').filter({ hasText: '巡检任务详情' }).last()
  await expect(inspDrawer).toContainText('轿厢照明')
  await expect(inspDrawer).toContainText('异常')
  await inspDrawer.getByRole('button', { name: '驳回' }).click()
  const rejectDialog = page.locator('.el-dialog').filter({ hasText: '驳回巡检任务' }).last()
  await rejectDialog.getByPlaceholder('如：异常点位缺少现场照片').fill('请补充异常点位照片')
  await rejectDialog.getByRole('button', { name: '确定驳回' }).click()
  await expect(lastMessage(page)).toContainText('已驳回')
})

test('全页面巡检：无运行时报错', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  await loginAs(page, 'admin')
  const paths = [
    '/dispatch',
    '/work-orders',
    '/work-orders/pool',
    '/elevators',
    '/maintenance',
    '/inspection',
    '/certificates',
    '/teams',
    '/feedback',
    '/users',
    '/stats',
    '/exports',
    '/broadcast',
    '/calendar',
    '/work-orders/1'
  ]
  for (const path of paths) {
    await page.goto(path)
    await page.waitForTimeout(500)
    await expect(page.locator('.layout, .el-card').first()).toBeVisible()
  }

  // 忽略静态资源 404（Mock 图片指向 8080）与浏览器扩展噪声
  const meaningful = errors.filter(
    (e) => !/Failed to load resource|favicon|net::ERR/.test(e)
  )
  expect(meaningful).toEqual([])
})

test('路由权限拦截：业主访问 /users 被重定向', async ({ page }) => {
  await loginAs(page, 'resident')
  await page.goto('/users')
  await expect(page).toHaveURL(/\/work-orders$/)
})
