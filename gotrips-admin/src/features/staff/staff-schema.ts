import { z } from 'zod'
import { newPasswordSchema } from '@/features/auth/password-schema'
import type { AdminStaffResponse } from '@/lib/api/generated/model'

export const staffRoleLabels: Record<AdminStaffResponse['role'], string> = {
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
}

export const staffRoleSchema = z.object({
  role: z.enum(['STAFF', 'ADMIN'], { error: 'Vui lòng chọn vai trò.' }),
})

export const createStaffSchema = staffRoleSchema.extend({
  fullName: z.string().trim().min(2, 'Họ và tên cần từ 2 đến 100 ký tự.')
    .max(100, 'Họ và tên cần từ 2 đến 100 ký tự.'),
  email: z.string().trim().toLowerCase().min(1, 'Vui lòng nhập địa chỉ email.')
    .max(254, 'Email không được quá 254 ký tự.')
    .pipe(z.email('Địa chỉ email chưa đúng định dạng.')),
  password: newPasswordSchema,
})

export type CreateStaffValues = z.infer<typeof createStaffSchema>
export type StaffRoleValues = z.infer<typeof staffRoleSchema>

const passwordAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function generateTemporaryPassword() {
  const random = crypto.getRandomValues(new Uint8Array(22))
  // Bảng 64 ký tự dùng đúng 6 bit. Tiền tố bảo đảm mật khẩu có cả chữ và số.
  return 'G7' + Array.from(random, (byte) => passwordAlphabet[byte & 63]).join('')
}
