import { describe, expect, it } from 'vitest'
import { changePasswordSchema, newPasswordSchema } from './password-schema'
import { createStaffSchema, generateTemporaryPassword } from '@/features/staff/staff-schema'

describe('Luật mật khẩu quản trị', () => {
  it('đếm byte UTF-8, kể cả chữ tiếng Việt', () => {
    const password = 'ắ'.repeat(23) + 'a12'
    expect(newPasswordSchema.safeParse(password).success).toBe(true)
    expect(newPasswordSchema.safeParse(password + '3').success).toBe(false)
  })

  it('gắn lỗi nhập lại vào đúng ô và giữ khoảng trắng trong mật khẩu', () => {
    const values = { currentPassword: ' matkhau123 ', newPassword: ' anpha123 ', confirmPassword: 'anpha123' }
    const invalid = changePasswordSchema.safeParse(values)
    if (invalid.success) throw new Error('Mật khẩu nhập lại phải khớp cả khoảng trắng.')
    expect(invalid.error.issues[0].path).toEqual(['confirmPassword'])
    expect(changePasswordSchema.parse({ ...values, confirmPassword: values.newPassword }).newPassword).toBe(values.newPassword)
  })

  it('mật khẩu sinh ngẫu nhiên dùng được khi tạo tài khoản STAFF hoặc ADMIN', () => {
    const rows = Array.from({ length: 8 }, generateTemporaryPassword)
    expect(new Set(rows).size).toBe(rows.length)
    for (const password of rows) {
      expect(createStaffSchema.parse({ fullName: ' Trần An ', email: ' BAN@EXAMPLE.COM ', role: 'STAFF', password }))
        .toEqual({ fullName: 'Trần An', email: 'ban@example.com', role: 'STAFF', password })
    }
    expect(createStaffSchema.safeParse({ fullName: 'Trần An', email: 'ban@example.com', role: 'CUSTOMER', password: rows[0] }).success)
      .toBe(false)
  })
})
