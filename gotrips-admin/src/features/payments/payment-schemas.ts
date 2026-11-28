import { z } from 'zod'

/**
 * Chỉ để báo lỗi sớm; API kiểm lại bằng cùng luật (AssignBankTransactionRequest, ResolveBankTransactionRequest).
 * Đổi câu chữ hay giới hạn ở đây thì đổi cả annotation của API.
 */
export const assignTransactionSchema = z.object({
  // Nhân viên hay gõ chữ thường hoặc dán kèm khoảng trắng: chuẩn hoá trước khi kiểm, giống API.
  bookingCode: z.string().trim().toUpperCase().min(1, 'Nhập mã đơn.')
    .regex(/^GT[2-9A-HJKMNP-Z]{6}$/, 'Mã đơn gồm GT và 6 ký tự, ví dụ GT7K4Q2M.'),
})

export const resolveTransactionSchema = z.object({
  note: z.string().trim().min(1, 'Ghi lại cách đã xử lý giao dịch.').max(500, 'Ghi chú tối đa 500 ký tự.'),
})

export type AssignTransactionValues = z.infer<typeof assignTransactionSchema>
export type ResolveTransactionValues = z.infer<typeof resolveTransactionSchema>
