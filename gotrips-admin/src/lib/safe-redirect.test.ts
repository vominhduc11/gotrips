import { describe, expect, it } from 'vitest'
import { buildLoginHref, getSafeRedirectPath } from './safe-redirect'

describe('Đường dẫn sau đăng nhập', () => {
  it.each([null, '', 'https://example.com', '//example.com', '/\\example.com', '/\t/example.com'])(
    'về tổng quan khi đường dẫn không hợp lệ (%s)',
    (value) => expect(getSafeRedirectPath(value)).toBe('/'),
  )

  it('giữ tham số và điểm cuộn của đường dẫn nội bộ', () => {
    const next = '/bookings?q=GT222222#danh-sach'
    expect(getSafeRedirectPath(next)).toBe(next)
    const params = new URL(buildLoginHref(next, true), 'https://admin.example').searchParams
    expect(params.get('next')).toBe(next)
    expect(params.get('reason')).toBe('access-revoked')
  })
})
