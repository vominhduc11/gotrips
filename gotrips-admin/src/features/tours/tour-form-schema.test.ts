import { describe, expect, it } from 'vitest'
import { createDepartureFormSchema } from './departure-form-schema'
import { emptyTour, tourFormSchema, type TourFormInput } from './tour-form-schema'

const tour: TourFormInput = {
  ...emptyTour, title: ' Đà Lạt ', slug: 'da-lat', destinationId: '2', durationDays: '3', durationNights: '2',
  departureCity: 'Hà Nội', shortDescription: 'Mô tả', coverImageUrl: 'https://images.unsplash.com/photo-1',
  coverImageAlt: 'Ảnh',
}

function errorsOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

describe('form tour', () => {
  it('đổi ô số thành số và cắt khoảng trắng như API', () => {
    expect(tourFormSchema.parse(tour)).toMatchObject({
      title: 'Đà Lạt', destinationId: 2, durationDays: 3, durationNights: 2, featured: false, status: 'ACTIVE',
    })
  })

  it('báo lỗi ở từng ô trống', () => {
    expect(Object.keys(errorsOf(tourFormSchema.safeParse(emptyTour))).sort()).toEqual([
      'coverImageAlt', 'coverImageUrl', 'departureCity', 'destinationId', 'durationDays', 'durationNights',
      'shortDescription', 'slug', 'title',
    ])
  })

  it.each([
    [{ durationNights: '4' }, 'durationNights', 'Số đêm không được lớn hơn số ngày.'],
    [{ durationDays: '0' }, 'durationDays', 'Số ngày phải từ 1 đến 365.'],
    [{ durationDays: '1,5' }, 'durationDays', 'Số ngày phải từ 1 đến 365.'],
    [{ slug: 'featured' }, 'slug', 'Slug này được hệ thống dùng riêng. Hãy chọn slug khác.'],
    [{ slug: 'Da Lat' }, 'slug', 'Slug chỉ gồm chữ thường không dấu và số, nối với nhau bằng một dấu gạch ngang.'],
    [{ shortDescription: 'a'.repeat(501) }, 'shortDescription', 'Giới thiệu ngắn không được quá 500 ký tự.'],
  ])('từ chối %o', (change, field, message) => {
    expect(errorsOf(tourFormSchema.safeParse({ ...tour, ...change }))[field]).toBe(message)
  })
})

describe('form chuyến khởi hành', () => {
  const schema = createDepartureFormSchema('2026-11-25')
  const departure = { departureDate: '2026-11-26', price: '3.490.000', originalPrice: '', totalSeats: '20' }

  it('nhận giá có dấu ngăn hàng nghìn, giá gốc trống thì không gửi', () => {
    expect(schema.parse(departure)).toEqual({
      departureDate: '2026-11-26', price: 3_490_000, originalPrice: undefined, totalSeats: 20,
    })
  })

  it.each([
    [{ departureDate: '2026-11-25' }, 'departureDate', 'Ngày khởi hành phải sau hôm nay.'],
    [{ departureDate: '' }, 'departureDate', 'Vui lòng chọn ngày khởi hành.'],
    [{ price: '0' }, 'price', 'Giá phải là số nguyên lớn hơn 0.'],
    [{ price: '' }, 'price', 'Vui lòng nhập giá.'],
    [{ originalPrice: '3490000' }, 'originalPrice', 'Giá gốc phải lớn hơn giá bán (hoặc để trống).'],
    [{ totalSeats: '0' }, 'totalSeats', 'Tổng số chỗ phải từ 1 đến 10.000.'],
  ])('từ chối %o', (change, field, message) => {
    const result = schema.safeParse({ ...departure, ...change })
    const first = result.error?.issues.find((issue) => issue.path[0] === field)
    expect(first?.message).toBe(message)
  })
})
