// E2E 公共工具：登录、表单控件定位、消息断言

export const ACCOUNTS = {
  admin: { id: 1, username: 'admin', realName: '管理员' },
  cs: { id: 2, username: 'cs001', realName: '客服小王' },
  engineer: { id: 3, username: 'engineer001', realName: '李师傅' },
  engineer2: { id: 4, username: 'engineer002', realName: '王师傅' },
  resident: { id: 5, username: 'resident001', realName: '张三' },
  resident2: { id: 6, username: 'resident002', realName: '李四' },
  vendorAdmin: { id: 8, username: 'vendor001', realName: '乙方刘经理' },
  vendorEngineer: { id: 9, username: 'vendoreng001', realName: '外委赵师傅' }
}

export const PASSWORD = '123456'

// 通过登录页真实登录
export async function loginByUI(page, username, password = PASSWORD) {
  await page.goto('/login')
  await page.getByPlaceholder('用户名').fill(username)
  await page.getByPlaceholder('密码').fill(password)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.waitForURL('**/work-orders')
}

// 直接注入 mock token 跳过登录（Mock 服务端 token 格式 mock-token-{userId}）
export async function loginAs(page, key) {
  const user = ACCOUNTS[key]
  await page.addInitScript((token) => localStorage.setItem('token', token), `mock-token-${user.id}`)
  await page.goto('/work-orders')
  await page.waitForSelector('.el-table')
}

// 按 label 定位表单项
export function formItem(page, label) {
  return page
    .locator('.el-form-item')
    .filter({ has: page.locator('.el-form-item__label', { hasText: label }) })
    .first()
}

// 选择 Element Plus 下拉项（只点当前可见的下拉）
export async function selectOption(page, label, optionText) {
  await formItem(page, label).locator('.el-select').click()
  await page
    .locator('.el-select-dropdown__item:visible', { hasText: new RegExp(`^${optionText}$`) })
    .first()
    .click()
}

// 确认 Element Plus 弹窗（MessageBox）：有输入框时填备注，再点主按钮
export async function confirmBox(page, confirm = true, inputText = 'E2E 自动化测试') {
  const box = page.locator('.el-message-box').last()
  await box.waitFor({ state: 'visible' })
  const input = box.locator('.el-message-box__input input')
  if (confirm && (await input.count()) && (await input.isVisible())) {
    await input.fill(inputText)
  }
  if (confirm) {
    await box.locator('.el-message-box__btns .el-button--primary').click()
  } else {
    await box.locator('.el-message-box__btns button').first().click()
  }
  await box.waitFor({ state: 'hidden' })
}

// 表格中按关键字定位行
export function tableRow(page, text) {
  return page.locator('.el-table__body-wrapper tr').filter({ hasText: text }).first()
}

// 最近一条成功/错误提示
export function lastMessage(page, type = 'success') {
  return page.locator(`.el-message--${type}`).last()
}

// 最小 PNG（1x1），用于完工图片上传
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
