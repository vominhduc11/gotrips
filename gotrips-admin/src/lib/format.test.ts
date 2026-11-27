import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatVND, getTodayInVietnam } from './format'

describe('Định dạng trong trang quản trị', () => {
  it('định dạng số tiền bằng VND', () => {
    expect(formatVND(1_234_000)).toMatch(/^1\.234\.000\s₫$/)
  })

  it('giữ nguyên ngày lịch', () => {
    expect(formatDate('2026-11-26')).toBe('26/11/2026')
  })

  it('đổi thời điểm sang giờ Việt Nam tại ranh giới ngày', () => {
    const time = '2026-11-25T17:05:00.000Z'
    expect(formatDateTime(time)).toBe('26/11/2026 00:05')
    expect(getTodayInVietnam(new Date(time))).toBe('2026-11-26')
  })
})
