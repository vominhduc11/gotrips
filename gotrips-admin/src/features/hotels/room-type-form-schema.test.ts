import { describe, expect, it } from 'vitest'
import { roomTypeFormSchema, roomTypeToFormValues, type RoomTypeFormInput } from './room-type-form-schema'

const valid: RoomTypeFormInput = {
  name: 'Phòng Deluxe', pricePerNight: '1.250.000', maxGuests: '2', bedType: '1 giường đôi', areaM2: '28',
  totalRooms: '0', amenityCodes: [], images: [],
}

function errors(change: Partial<RoomTypeFormInput>) {
  const result = roomTypeFormSchema.safeParse({ ...valid, ...change })
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

describe('schema form loại phòng', () => {
  it('nhận giá có dấu chấm ngăn nghìn và cho tổng số phòng bằng 0', () => {
    expect(roomTypeFormSchema.parse(valid)).toMatchObject({ pricePerNight: 1_250_000, maxGuests: 2, totalRooms: 0 })
  })

  it('loại phòng mới mặc định 2 khách, các ô số để trống', () => {
    expect(roomTypeToFormValues(undefined)).toMatchObject({ maxGuests: '2', totalRooms: '', pricePerNight: '' })
  })

  it.each<[Partial<RoomTypeFormInput>, string]>([
    [{ name: '' }, 'name: Vui lòng nhập tên loại phòng.'],
    [{ pricePerNight: '' }, 'pricePerNight: Vui lòng nhập giá mỗi đêm.'],
    [{ pricePerNight: '0' }, 'pricePerNight: Giá mỗi đêm phải từ 1 đến 1.000.000.000.000 ₫.'],
    [{ maxGuests: '31' }, 'maxGuests: Số khách tối đa mỗi phòng phải từ 1 đến 30.'],
    [{ areaM2: '2.5' }, 'areaM2: Diện tích phải từ 1 đến 10.000 m².'],
    [{ totalRooms: '' }, 'totalRooms: Vui lòng nhập tổng số phòng.'],
    [{ totalRooms: '-1' }, 'totalRooms: Tổng số phòng phải từ 0 đến 10.000.'],
    [
      { images: [{ url: 'https://images.unsplash.com/photo-a', alt: 'A' }, { url: 'https://images.unsplash.com/photo-a', alt: 'A' }] },
      'images.1.url: Ảnh này đã có trong bộ ảnh.',
    ],
  ])('báo lỗi sớm giống API %#', (change, expected) => {
    expect(errors(change)).toContain(expected)
  })
})
