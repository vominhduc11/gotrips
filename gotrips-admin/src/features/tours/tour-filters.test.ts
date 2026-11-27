import { describe, expect, it } from 'vitest'
import {
  buildTourSearch, defaultTourFilters, hasActiveTourFilters, parseTourFilters, tourApiParams, tourSortFromTable,
  tourTableSorting,
} from './tour-filters'

const parse = (search: string) => parseTourFilters(new URLSearchParams(search))

describe('bộ lọc tour trên URL', () => {
  it('đọc đủ tham số hợp lệ và gửi đúng kiểu cho API', () => {
    const filters = parse('q=%20đà%20lạt%20&destinationId=3&status=DELETED&featured=false&page=2&size=50&sort=TITLE_ASC')

    expect(tourApiParams(filters)).toEqual({
      q: 'đà lạt', destinationId: 3, status: 'DELETED', featured: false, page: 2, size: 50, sort: 'TITLE_ASC',
    })
  })

  it('đưa giá trị rác về mặc định thay vì làm hỏng trang', () => {
    expect(parse('destinationId=abc&status=KHAC&featured=1&page=0&size=1000&sort=x')).toEqual(defaultTourFilters)
  })

  it('không gửi tham số trống và không lọc trạng thái theo mặc định', () => {
    expect(tourApiParams(defaultTourFilters)).toEqual({ page: 1, size: 20, sort: 'NEWEST' })
  })

  it('chỉ ghi lên URL phần khác mặc định', () => {
    expect(buildTourSearch(defaultTourFilters).toString()).toBe('')
    const filters = { ...defaultTourFilters, q: 'sapa', featured: 'true' as const, page: 3 }
    const search = buildTourSearch(filters)
    expect(Object.fromEntries(search)).toEqual({ q: 'sapa', featured: 'true', page: '3' })
    expect(parseTourFilters(search)).toEqual(filters)
  })

  it('nhận biết đang lọc (đổi sắp xếp hay cỡ trang không tính)', () => {
    expect(hasActiveTourFilters({ ...defaultTourFilters, sort: 'OLDEST', size: 50 })).toBe(false)
    expect(hasActiveTourFilters({ ...defaultTourFilters, status: 'HIDDEN' })).toBe(true)
  })

  it('ánh xạ sắp xếp của bảng chỉ cho cột tên, bỏ sắp xếp thì về mới nhất', () => {
    expect(tourTableSorting('TITLE_DESC')).toEqual([{ id: 'title', desc: true }])
    expect(tourTableSorting('OLDEST')).toEqual([])
    expect(tourSortFromTable([{ id: 'title', desc: false }])).toBe('TITLE_ASC')
    expect(tourSortFromTable([])).toBe('NEWEST')
  })
})
