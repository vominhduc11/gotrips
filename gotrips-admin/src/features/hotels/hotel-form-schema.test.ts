import { describe, expect, it } from 'vitest'
import { hotelFormFields, hotelFormSchema, toHotelUpdateRequest, type HotelFormInput } from './hotel-form-schema'

const photo = (name: string) => `https://images.unsplash.com/photo-${name}`

const valid: HotelFormInput = {
  name: ' Khách sạn Đồi Thông ', slug: 'doi-thong', destinationId: '1', starRating: '4',
  area: 'Phường 3, Đà Lạt', description: 'Giới thiệu', amenityCodes: ['pool'], checkInTime: '14:00',
  checkOutTime: '12:00', imageUrl: photo('main'), imageAlt: 'Mặt tiền',
  images: [{ url: photo('a'), alt: 'Sảnh' }], status: 'ACTIVE',
}

function errors(change: Partial<HotelFormInput>) {
  const result = hotelFormSchema.safeParse({ ...valid, ...change })
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('schema form khách sạn', () => {
  it('đổi ô chữ sang số và cắt khoảng trắng; request sửa không mang trạng thái', () => {
    const values = hotelFormSchema.parse(valid)
    expect(values).toMatchObject({ name: 'Khách sạn Đồi Thông', destinationId: 1, starRating: 4 })
    expect(toHotelUpdateRequest(values)).toEqual({
      name: 'Khách sạn Đồi Thông', slug: 'doi-thong', destinationId: 1, starRating: 4, area: 'Phường 3, Đà Lạt',
      description: 'Giới thiệu', amenityCodes: ['pool'], checkInTime: '14:00', checkOutTime: '12:00',
      imageUrl: photo('main'), imageAlt: 'Mặt tiền', images: [{ url: photo('a'), alt: 'Sảnh' }],
    })
  })

  it.each<[Partial<HotelFormInput>, string]>([
    [{ name: ' ' }, 'name: Vui lòng nhập tên khách sạn.'],
    [{ slug: 'featured' }, 'slug: Slug này được hệ thống dùng riêng. Hãy chọn slug khác.'],
    [{ slug: 'Đồi Thông' }, 'slug: Slug chỉ gồm chữ thường không dấu và số, nối với nhau bằng một dấu gạch ngang.'],
    [{ destinationId: '' }, 'destinationId: Vui lòng chọn điểm đến.'],
    [{ starRating: '' }, 'starRating: Vui lòng chọn hạng sao.'],
    [{ area: 'a'.repeat(151) }, 'area: Khu vực không được quá 150 ký tự.'],
    [{ description: 'a'.repeat(5001) }, 'description: Giới thiệu không được quá 5.000 ký tự.'],
    [{ checkInTime: '' }, 'checkInTime: Vui lòng nhập giờ nhận phòng.'],
    [{ checkOutTime: '24:00' }, 'checkOutTime: Giờ phải có dạng HH:mm, ví dụ 14:00.'],
    [{ imageAlt: '' }, 'imageAlt: Vui lòng nhập mô tả ảnh.'],
    [{ images: [{ url: '', alt: 'A' }] }, 'images.0.url: Vui lòng nhập địa chỉ ảnh.'],
    [{ images: [{ url: photo('main'), alt: 'A' }] }, 'images.0.url: Bộ ảnh xem thêm không lặp lại ảnh đại diện.'],
    [
      { images: [{ url: photo('a'), alt: 'A' }, { url: photo('a'), alt: 'B' }] },
      'images.1.url: Ảnh này đã có trong bộ ảnh.',
    ],
    [
      { images: Array.from({ length: 21 }, (_, index) => ({ url: photo(String(index)), alt: 'A' })) },
      'images: Bộ ảnh có tối đa 20 ảnh.',
    ],
  ])('báo lỗi sớm giống API %#', (change, expected) => {
    expect(errors(change)).toContain(expected)
  })

  it('liệt kê ô của từng ảnh theo đúng thứ tự trên màn hình', () => {
    expect(hotelFormFields(2).slice(-7)).toEqual([
      'imageAlt', 'images.0.url', 'images.0.alt', 'images.1.url', 'images.1.alt', 'images', 'status',
    ])
  })
})
