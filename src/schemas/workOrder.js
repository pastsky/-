import { z } from 'zod'
import { ELEVATOR_REQUIRED_TYPES } from '@/utils/dict'

// 报修/编辑工单校验 schema：唯一的校验真源，UI 只负责渲染 errors
export const workOrderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, '请输入工单标题')
      .min(2, '标题至少 2 个字')
      .max(50, '标题不超过 50 字'),
    type: z.string().min(1, '请选择工单类型'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], { error: '请选择优先级' }),
    communityId: z.number({ error: '请选择小区' }).int().positive('请选择小区'),
    building: z.string().max(20, '楼栋不超过 20 字').optional(),
    room: z.string().max(30, '房号不超过 30 字').optional(),
    elevatorId: z.number().int().positive().nullable().optional(),
    description: z.string().max(500, '问题描述不超过 500 字').optional()
  })
  .superRefine((val, ctx) => {
    if (ELEVATOR_REQUIRED_TYPES.includes(val.type) && !val.elevatorId) {
      ctx.addIssue({
        code: 'custom',
        path: ['elevatorId'],
        message: '电梯类工单必须选择电梯档案'
      })
    }
  })
