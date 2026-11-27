import { describe, expect, it } from 'vitest'
import { activeBookingTab, bookingApiParams, bookingSort, bookingTabs, buildBookingSearch, isBookingCode,
  parseBookingFilters, tableSorting } from './booking-filters'

describe('URL của danh sách đơn đặt chỗ', () => {
  it('mặc định vào đơn chờ xử lý và bỏ giá trị không hợp lệ', () => {
    const filters = parseBookingFilters(new URLSearchParams('kind=bad&status=bad&size=101&page=0&sort=no&createdFrom=2026-02-30'))
    expect(filters).toMatchObject({ status: 'PENDING', page: 1, size: 20, sort: 'CREATED_DESC' })
    expect(filters.kind).toBeUndefined()
    expect(filters.createdFrom).toBeUndefined()
    expect(buildBookingSearch(filters).toString()).toBe('')
  })

  it('giữ nội dung tìm, dịch vụ, khoảng ngày, phân trang và sắp xếp qua URL', () => {
    const input = new URLSearchParams({
      q: '  Nguyễn & Bình ', kind: 'TOUR', page: '2', size: '50', sort: 'TOTAL_ASC',
      createdFrom: '2026-11-25', createdTo: '2026-11-26',
    })
    const filters = parseBookingFilters(input)
    expect(filters.q).toBe('Nguyễn & Bình')
    expect(parseBookingFilters(buildBookingSearch(filters))).toEqual(filters)
    expect(bookingSort(tableSorting(filters.sort))).toBe('TOTAL_ASC')
    expect(bookingApiParams(filters)).toMatchObject({ page: 2, size: 50, status: 'PENDING', kind: 'TOUR' })
  })

  it('bỏ ngày kết thúc trước ngày bắt đầu', () => {
    const filters = parseBookingFilters(new URLSearchParams('createdFrom=2026-11-26&createdTo=2026-11-25'))
    expect(filters.createdFrom).toBe('2026-11-26')
    expect(filters.createdTo).toBeUndefined()
  })

  it.each(bookingTabs)('đổi qua lại chính xác giữa tab $key và bộ lọc', (tab) => {
    const filters = { ...parseBookingFilters(new URLSearchParams()), status: tab.status, paymentStatus: tab.paymentStatus }
    expect(activeBookingTab(parseBookingFilters(buildBookingSearch(filters)))).toBe(tab.key)
  })

  it('lọc được đơn huỷ đã nhận tiền và nhận biết tab Tất cả', () => {
    const refunded = parseBookingFilters(new URLSearchParams('status=CANCELLED&paymentStatus=PAID'))
    expect(bookingApiParams(refunded)).toMatchObject({ status: 'CANCELLED', paymentStatus: 'PAID' })
    expect(activeBookingTab(refunded)).toBeUndefined()
    expect(bookingApiParams(parseBookingFilters(new URLSearchParams('status=ALL'))).status).toBeUndefined()
  })

  it('chỉ chấp nhận mã đơn đúng định dạng cho client Orval', () => {
    expect(isBookingCode('GT7K4Q2M')).toBe(true)
    expect(isBookingCode('GT0K4Q2M')).toBe(false)
    expect(isBookingCode('../auth/me')).toBe(false)
  })
})
