import { describe, expect, it } from 'vitest'
import { buildPaymentSearch, parsePaymentFilters, paymentApiParams, paymentsOfBookingHref, paymentTabs } from './payment-filters'

describe('URL của danh sách giao dịch ngân hàng', () => {
  it('mặc định mở giao dịch cần xử lý và bỏ giá trị không hợp lệ', () => {
    const filters = parsePaymentFilters(new URLSearchParams('tab=bad&page=0&size=101'))
    expect(filters).toEqual({ tab: 'review', q: '', page: 1, size: 20 })
    expect(buildPaymentSearch(filters).toString()).toBe('')
    expect(paymentApiParams(filters)).toEqual({ needsReview: true, q: undefined, page: 1, size: 20 })
  })

  it('giữ nội dung tìm, tab và phân trang qua URL', () => {
    const filters = parsePaymentFilters(new URLSearchParams({ tab: 'done', q: '  NGUYEN VAN A ', page: '3', size: '50' }))
    expect(filters.q).toBe('NGUYEN VAN A')
    expect(parsePaymentFilters(buildPaymentSearch(filters))).toEqual(filters)
    expect(paymentApiParams(filters)).toEqual({ needsReview: false, q: 'NGUYEN VAN A', page: 3, size: 50 })
  })

  it.each(paymentTabs)('tab $key đổi đúng thành bộ lọc needsReview của API', ({ key }) => {
    const filters = { ...parsePaymentFilters(new URLSearchParams()), tab: key }
    expect(parsePaymentFilters(buildPaymentSearch(filters)).tab).toBe(key)
    expect(paymentApiParams(filters).needsReview).toBe({ review: true, done: false, all: undefined }[key])
  })

  it('cắt nội dung tìm quá 100 ký tự như API', () => {
    expect(parsePaymentFilters(new URLSearchParams({ q: 'x'.repeat(101) })).q).toBe('')
  })

  it('dẫn từ chi tiết đơn tới mọi giao dịch của đơn', () => {
    expect(paymentsOfBookingHref('GT7K4Q2M')).toBe('/payments?tab=all&q=GT7K4Q2M')
  })
})
