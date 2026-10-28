import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { loginByUI, loginAs, selectOption, confirmBox, tableRow } from './helpers'

// Mock 数据保存在 dev server 内存中，用例需串行执行
test.describe.configure({ mode: 'serial' })

const TITLE = `E2E测试-厨房水管漏水-${Date.now()}`
const NEW_USERNAME = `e2e_${Date.now()}`

test('登录校验与业主登录跳转', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('物业工单管理平台')).toBeVisible()

  // 空表单提示
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.locator('.el-message')).toContainText('请输入用户名和密码')

  // 错误密码
  await page.getByPlaceholder('用户名').fill('resident001')
  await page.getByPlaceholder('密码').fill('wrong-pass')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.locator('.el-message--error').last()).toContainText('用户名或密码错误')

  // 正确登录
  await page.getByPlaceholder('密码').fill('123456')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/\/work-orders$/)
  await expect(page.locator('.username')).toHaveText('张三')
  await expect(page.locator('.el-table__body-wrapper')).toBeVisible()
})

test('业主只能看到自己的工单，且只能选低/中优先级', async ({ page }) => {
  await loginAs(page, 'resident')

  const body = page.locator('.el-table__body-wrapper')
  await expect(body).toContainText('3栋2单元水管漏水')
  // 李四（resident002）的工单不应出现
  await expect(body).not.toContainText('5栋1单元停电')
  await expect(body).not.toContainText('地下车库门禁故障')

  // 新建工单
  await page.getByRole('button', { name: '新建工单' }).click()
  await page.waitForURL(/\/work-orders\/create$/)

  // 业主优先级下拉只有 低/中
  await page.locator('.el-form-item').filter({ hasText: '优先级' }).locator('.el-select').click()
  const options = page.locator('.el-select-dropdown__item')
  await expect(options.filter({ hasText: /^低$/ })).toBeVisible()
  await expect(options.filter({ hasText: /^中$/ })).toBeVisible()
  await expect(options.filter({ hasText: /^紧急$/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByPlaceholder('请输入工单标题').fill(TITLE)
  await selectOption(page, '类型', '水')
  await selectOption(page, '优先级', '中')
  await page.getByPlaceholder('如 3栋2单元501').fill('3栋2单元501')
  await page.getByPlaceholder('请描述问题').fill('自动化测试创建的工单')
  await page.getByRole('button', { name: '保存' }).click()

  await expect(page.locator('.el-message--success').last()).toContainText('创建成功')
  await page.waitForURL(/\/work-orders$/)
  await expect(tableRow(page, TITLE)).toContainText('待派单')
})

test('客服派单、统计报表与 CSV 导出', async ({ page }) => {
  await loginAs(page, 'cs')

  // 派单
  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  await page.getByRole('button', { name: '派单', exact: true }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '维修工' }).last()
  await dialog.locator('.el-form-item').filter({ hasText: '维修工' }).locator('.el-select__wrapper').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: '李师傅' }).first().click()
  await dialog.getByRole('button', { name: '确定派单' }).click()

  await expect(page.locator('.el-message--success').last()).toContainText('派单成功')
  await expect(page.locator('.el-card').first()).toContainText('待接单')

  // 统计报表
  await page.getByRole('menuitem', { name: '统计报表' }).click()
  await page.waitForURL(/\/stats$/)
  await expect(page.locator('.metric-card')).toHaveCount(9)
  await expect(page.locator('.chart canvas').first()).toBeVisible()
  await expect(page.getByText('维修工绩效')).toBeVisible()
  await expect(page.locator('.el-table__body-wrapper')).toContainText('李师傅')

  // 切换趋势粒度
  await page.locator('.el-radio-button__inner', { hasText: '周' }).click()
  await expect(page.locator('.chart canvas').first()).toBeVisible()

  // CSV 导出
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出报表' }).click()
  ])
  expect(download.suggestedFilename()).toMatch(/^统计报表_\d{4}-\d{2}-\d{2}\.csv$/)
  const content = fs.readFileSync(await download.path(), 'utf8')
  expect(content).toContain('【统计总览】')
  expect(content).toContain('【工单趋势】')
  expect(content).toContain('【报修类型分布】')
  expect(content).toContain('【维修工绩效】')
})

test('维修工接单并完工，通知铃铛与菜单权限', async ({ page }) => {
  await loginAs(page, 'engineer')

  // 维修工无用户管理/统计报表菜单
  await expect(page.getByRole('menuitem', { name: '用户管理' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: '统计报表' })).toHaveCount(0)
  // 有未读通知
  await expect(page.locator('.el-badge__content').first()).toBeVisible()

  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  // 接单
  await page.getByRole('button', { name: '接单', exact: true }).click()
  await confirmBox(page)
  await expect(page.locator('.el-message--success').last()).toContainText('已接单')
  await expect(page.locator('.el-card').first()).toContainText('处理中')

  // 完工（带完工说明的 prompt）
  await page.getByRole('button', { name: '完工', exact: true }).click()
  await confirmBox(page)
  await expect(page.locator('.el-message--success').last()).toContainText('已完工')
  await expect(page.locator('.el-card').first()).toContainText('已完成')
  await expect(page.locator('.el-timeline')).toContainText('完工')

  // 打开通知抽屉
  await page.locator('.bell-icon').click()
  await expect(page.locator('.el-drawer')).toContainText('站内通知')
})

test('业主评价后工单自动关闭', async ({ page }) => {
  await loginAs(page, 'resident')

  await page.getByPlaceholder('工单号 / 标题').fill(TITLE)
  await page.getByRole('button', { name: '查询' }).click()
  await tableRow(page, TITLE).getByRole('button', { name: '详情' }).click()
  await page.waitForURL(/\/work-orders\/\d+$/)

  await page.getByRole('button', { name: '评价', exact: true }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '评分' }).last()
  await dialog.locator('.el-rate__item').nth(4).click()
  await dialog.getByPlaceholder('说说处理情况').fill('E2E 评价：处理及时')
  await dialog.getByRole('button', { name: '提交评价' }).click()

  await expect(page.locator('.el-message--success').last()).toContainText('评价成功')
  await expect(page.locator('.el-card').first()).toContainText('已关闭')
  await expect(page.locator('.el-descriptions')).toContainText('E2E 评价：处理及时')
})

test('管理员用户管理：新增、删除保护、禁用', async ({ page }) => {
  await loginAs(page, 'admin')

  await page.getByRole('menuitem', { name: '用户管理' }).click()
  await page.waitForURL(/\/users$/)
  await expect(page.locator('.el-table__body-wrapper')).toContainText('admin')

  // 新增用户
  await page.getByRole('button', { name: '新增用户' }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '新增用户' }).last()
  await dialog.getByPlaceholder('登录账号').fill(NEW_USERNAME)
  await dialog.getByPlaceholder('初始密码').fill('123456')
  await dialog.getByPlaceholder('真实姓名').fill('E2E机器人')
  await dialog.locator('.el-form-item').filter({ hasText: '手机号' }).locator('input').fill('13900000000')
  await dialog.locator('.el-form-item').filter({ hasText: '地址' }).locator('input').fill('9栋1单元101')
  await dialog.locator('.el-select__wrapper').click()
  await page.locator('.el-select-dropdown__item:visible').filter({ hasText: /^业主$/ }).first().click()
  await dialog.getByRole('button', { name: '保存' }).click()

  await expect(page.locator('.el-message--success').last()).toContainText('新增成功')
  await expect(tableRow(page, NEW_USERNAME)).toContainText('业主')

  // 不能删除自己
  await tableRow(page, 'admin').getByRole('button', { name: '删除' }).click()
  await confirmBox(page)
  await expect(page.locator('.el-message--error').last()).toContainText('不能删除自己')

  // 删除无工单用户 -> 置为禁用
  await tableRow(page, NEW_USERNAME).getByRole('button', { name: '删除' }).click()
  await confirmBox(page)
  await expect(page.locator('.el-message--success').last()).toContainText('已删除')
  await expect(tableRow(page, NEW_USERNAME)).toContainText('禁用')
})

test('路由权限拦截：业主访问 /users 被重定向', async ({ page }) => {
  await loginAs(page, 'resident')
  await page.goto('/users')
  await expect(page).toHaveURL(/\/work-orders$/)
})
