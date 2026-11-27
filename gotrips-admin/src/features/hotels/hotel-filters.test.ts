import { describe, expect, it } from 'vitest'
import {
  buildHotelSearch, defaultHotelFilters, hasActiveHotelFilters, hotelApiParams, hotelSortFromTable, hotelTableSorting,
  parseHotelFilters,
} from './hotel-filters'

describe('bộ lọc khách sạn trên URL', () => {
  it('giá trị sai về mặc định', () => {
    expect(parseHotelFilters(new URLSearchParams('destinationId=abc&status=XOA&page=0&size=500&sort=PRICE')))
      .toEqual(defaultHotelFilters)
  })

  it('chỉ ghi giá trị khác mặc định và đọc lại được', () => {
    const filters = parseHotelFilters(new URLSearchParams('q=doi&destinationId=2&status=DELETED&page=3&sort=NAME_ASC'))
    const search = buildHotelSearch(filters).toString()
    expect(search).toBe('q=doi&destinationId=2&status=DELETED&page=3&sort=NAME_ASC')
    expect(buildHotelSearch(defaultHotelFilters).toString()).toBe('')
    expect(hotelApiParams(defaultHotelFilters)).toMatchObject({ q: undefined, page: 1, size: 20, sort: 'NEWEST' })
  })

  it('chỉ coi tìm kiếm, điểm đến và trạng thái là đang lọc', () => {
    expect(hasActiveHotelFilters(parseHotelFilters(new URLSearchParams('page=2&sort=OLDEST')))).toBe(false)
    expect(hasActiveHotelFilters(parseHotelFilters(new URLSearchParams('destinationId=1')))).toBe(true)
  })

  it('đổi qua lại giữa sắp xếp trên URL và sắp xếp của bảng', () => {
    expect(hotelTableSorting('NAME_DESC')).toEqual([{ id: 'name', desc: true }])
    expect(hotelTableSorting('OLDEST')).toEqual([])
    expect(hotelSortFromTable([{ id: 'name', desc: false }])).toBe('NAME_ASC')
    expect(hotelSortFromTable([])).toBe('NEWEST')
  })
})
