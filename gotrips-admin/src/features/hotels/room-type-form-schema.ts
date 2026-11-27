import { z } from 'zod'
import type { AdminRoomTypeResponse } from '@/lib/api/generated/model'
import { checkGallery, imageFields, imageListSchema } from './image-schema'
import { MAX_AMENITIES } from './hotel-form-schema'

const MAX_PRICE = 1_000_000_000_000

/** "1.000.000" hay "1 000 000" đều là một triệu: bỏ dấu ngăn hàng nghìn trước khi kiểm. */
const digits = (value: string) => value.replace(/[.\s]/g, '')

const isWholeNumberIn = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max

/** Ô số giữ chữ trong lúc nhập (ô trống vẫn là trống, không thành 0), đổi sang số khi form hợp lệ. */
const wholeNumber = (requiredMessage: string, min: number, max: number, rangeMessage: string) =>
  z.string().trim().min(1, requiredMessage)
    .refine((value) => isWholeNumberIn(value, min, max), rangeMessage)
    .transform(Number)

/**
 * Chỉ để báo lỗi sớm. Giới hạn và câu chữ khớp `AdminRoomTypeRequest` của API: đổi một nơi phải đổi nơi kia. Mức tổng
 * số phòng tối thiểu khi giảm do API tính.
 */
export const roomTypeFormSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên loại phòng.')
    .max(150, 'Tên loại phòng không được quá 150 ký tự.'),
  pricePerNight: z.string().transform(digits).pipe(z.string().min(1, 'Vui lòng nhập giá mỗi đêm.')
    .refine((value) => isWholeNumberIn(value, 1, MAX_PRICE), 'Giá mỗi đêm phải từ 1 đến 1.000.000.000.000 ₫.')
    .transform(Number)),
  maxGuests: wholeNumber('Vui lòng nhập số khách tối đa.', 1, 30, 'Số khách tối đa mỗi phòng phải từ 1 đến 30.'),
  bedType: z.string().trim().min(1, 'Vui lòng nhập loại giường.')
    .max(150, 'Loại giường không được quá 150 ký tự.'),
  areaM2: wholeNumber('Vui lòng nhập diện tích.', 1, 10_000, 'Diện tích phải từ 1 đến 10.000 m².'),
  totalRooms: wholeNumber('Vui lòng nhập tổng số phòng.', 0, 10_000, 'Tổng số phòng phải từ 0 đến 10.000.'),
  amenityCodes: z.array(z.string()).max(MAX_AMENITIES, 'Chọn tối đa 30 tiện ích.'),
  images: imageListSchema,
}).superRefine((room, ctx) => checkGallery(room.images, null, ctx))

export type RoomTypeFormInput = z.input<typeof roomTypeFormSchema>
export type RoomTypeFormOutput = z.output<typeof roomTypeFormSchema>

/** Thứ tự ô trên form: ô lỗi đầu tiên theo thứ tự này được focus. */
export function roomTypeFormFields(imageCount: number) {
  return [
    'name', 'pricePerNight', 'maxGuests', 'bedType', 'areaM2', 'totalRooms', 'amenityCodes',
    ...imageFields(imageCount), 'images',
  ] as const
}

export function roomTypeToFormValues(roomType: AdminRoomTypeResponse | undefined): RoomTypeFormInput {
  return {
    name: roomType?.name ?? '',
    pricePerNight: roomType ? String(roomType.pricePerNight) : '',
    maxGuests: roomType ? String(roomType.maxGuests) : '2',
    bedType: roomType?.bedType ?? '',
    areaM2: roomType ? String(roomType.areaM2) : '',
    totalRooms: roomType ? String(roomType.totalRooms) : '',
    amenityCodes: roomType?.amenities.map((amenity) => amenity.code) ?? [],
    images: roomType?.images.map(({ url, alt }) => ({ url, alt })) ?? [],
  }
}
