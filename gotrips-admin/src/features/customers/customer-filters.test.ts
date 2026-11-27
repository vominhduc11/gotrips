import { describe, expect, it } from 'vitest'
import { buildCustomerSearch, customerApiParams, isCustomerId, parseCustomerFilters } from './customer-filters'

describe('Bộ lọc khách hàng trên URL', () => {
  it('đọc giá trị hợp lệ và không đưa mặc định vào URL', () => {
    const filters = parseCustomerFilters(new URLSearchParams('q=%20An%20&sort=PAID_DESC&size=50&page=2'))
    expect(customerApiParams(filters)).toEqual({ q: 'An', sort: 'PAID_DESC', size: 50, page: 2 })
    expect(buildCustomerSearch(filters).toString()).toBe('q=An&sort=PAID_DESC&page=2&size=50')
    expect(buildCustomerSearch(parseCustomerFilters(new URLSearchParams())).toString()).toBe('')
  })

  it('rơi về mặc định khi sai kiểu hoặc vượt giới hạn API', () => {
    const filters = parseCustomerFilters(new URLSearchParams('sort=OLDEST&size=101&page=2147483648'))
    expect(customerApiParams(filters)).toEqual({ q: undefined, sort: 'CREATED_DESC', size: 20, page: 1 })
    expect(isCustomerId('12345678-0000-4000-8000-000000000001')).toBe(true)
    expect(isCustomerId('12345678%2Fbookings')).toBe(false)
  })
})
