import { z } from 'zod'

const phone = z
  .string()
  .trim()
  .refine((v) => !v || /^1\d{10}$/.test(v), '手机号格式不正确')

// 用户新增/编辑 schema：新增时密码必填，编辑时可不填
export function buildUserSchema({ requirePassword }) {
  return z
    .object({
      username: z
        .string()
        .trim()
        .min(3, '用户名至少 3 位')
        .max(20, '用户名不超过 20 位')
        .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字、下划线'),
      realName: z.string().trim().min(1, '请填写姓名').max(20, '姓名不超过 20 字'),
      role: z.string().min(1, '请选择角色'),
      phone,
      teamId: z.number().int().positive().nullable().optional(),
      address: z.string().max(100, '地址不超过 100 字').optional(),
      password: requirePassword
        ? z.string().min(6, '密码至少 6 位').max(32, '密码不超过 32 位')
        : z.string().optional()
    })
    .refine((v) => !v.password || v.password.length >= 6, {
      path: ['password'],
      message: '密码至少 6 位'
    })
}
