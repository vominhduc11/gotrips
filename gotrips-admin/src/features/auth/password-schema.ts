import { z } from 'zod'

export const passwordHelp = 'Từ 8 đến 72 ký tự, có chữ và số, tối đa 72 byte UTF-8. Chữ có dấu chiếm nhiều byte hơn.'
const encoder = new TextEncoder()

// Khớp RegistrationRules ở API. Mật khẩu giữ nguyên khoảng trắng khi gửi.
export const newPasswordSchema = z.string()
  .refine((value) => value.trim().length > 0, 'Vui lòng nhập mật khẩu.')
  .min(8, 'Mật khẩu cần từ 8 đến 72 ký tự.')
  .max(72, 'Mật khẩu cần từ 8 đến 72 ký tự.')
  .refine((value) => encoder.encode(value).length <= 72, 'Mật khẩu quá dài (tối đa 72 byte; ký tự có dấu chiếm nhiều byte hơn).')
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), 'Mật khẩu cần có cả chữ cái và chữ số.')

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .refine((value) => value.trim().length > 0, 'Vui lòng nhập mật khẩu hiện tại.')
    .refine((value) => encoder.encode(value).length <= 72, 'Mật khẩu hiện tại không đúng.'),
  newPassword: newPasswordSchema,
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu.'),
}).refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, {
  path: ['confirmPassword'],
  message: 'Mật khẩu nhập lại chưa khớp.',
})

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
