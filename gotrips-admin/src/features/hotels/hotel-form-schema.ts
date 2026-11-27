import { z } from 'zod'
import type { AdminHotelDetailResponse, AdminUpdateHotelRequest } from '@/lib/api/generated/model'
import { slugPattern, slugPatternMessage } from '@/lib/slug'
import { checkGallery, imageFields, imageListSchema } from './image-schema'

export const HOTEL_SLUG_MAX_LENGTH = 150
export const HOTEL_DESCRIPTION_MAX_LENGTH = 5000
export const MAX_AMENITIES = 30

const required = (message: string, max: number, tooLong: string) =>
  z.string().trim().min(1, message).max(max, tooLong)

const time = (requiredMessage: string) =>
  z.string().trim().min(1, requiredMessage)
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải có dạng HH:mm, ví dụ 14:00.')

/**
 * Chỉ để báo lỗi sớm. Giới hạn và câu chữ khớp `AdminHotelRules` + `AdminCreateHotelRequest` của API: đổi một nơi phải
 * đổi nơi kia. Slug trùng, điểm đến đã mất, tiện ích trong danh mục và nguồn ảnh được phép do API kiểm.
 */
export const hotelFormSchema = z.object({
  name: required('Vui lòng nhập tên khách sạn.', 200, 'Tên khách sạn không được quá 200 ký tự.'),
  slug: required('Vui lòng nhập slug.', HOTEL_SLUG_MAX_LENGTH, 'Slug không được quá 150 ký tự.')
    .regex(slugPattern, slugPatternMessage)
    .refine((slug) => slug !== 'featured', 'Slug này được hệ thống dùng riêng. Hãy chọn slug khác.'),
  destinationId: z.string().min(1, 'Vui lòng chọn điểm đến.').transform(Number),
  starRating: z.string().min(1, 'Vui lòng chọn hạng sao.').transform(Number),
  area: required('Vui lòng nhập khu vực.', 150, 'Khu vực không được quá 150 ký tự.'),
  description: required('Vui lòng nhập giới thiệu.', HOTEL_DESCRIPTION_MAX_LENGTH,
    'Giới thiệu không được quá 5.000 ký tự.'),
  amenityCodes: z.array(z.string()).max(MAX_AMENITIES, 'Chọn tối đa 30 tiện ích.'),
  checkInTime: time('Vui lòng nhập giờ nhận phòng.'),
  checkOutTime: time('Vui lòng nhập giờ trả phòng.'),
  imageUrl: required('Vui lòng nhập địa chỉ ảnh.', 500, 'Địa chỉ ảnh không được quá 500 ký tự.'),
  imageAlt: required('Vui lòng nhập mô tả ảnh.', 255, 'Mô tả ảnh không được quá 255 ký tự.'),
  images: imageListSchema,
  /** Chỉ form tạo dùng; khách sạn đã có thì đổi trạng thái bằng thao tác riêng. */
  status: z.enum(['ACTIVE', 'HIDDEN']),
}).superRefine((hotel, ctx) => checkGallery(hotel.images, hotel.imageUrl, ctx))

export type HotelFormInput = z.input<typeof hotelFormSchema>
export type HotelFormOutput = z.output<typeof hotelFormSchema>

/** Thứ tự ô trên form: ô lỗi đầu tiên theo thứ tự này được focus. */
export function hotelFormFields(imageCount: number) {
  return [
    'name', 'slug', 'destinationId', 'starRating', 'area', 'description', 'amenityCodes', 'checkInTime',
    'checkOutTime', 'imageUrl', 'imageAlt', ...imageFields(imageCount), 'images', 'status',
  ] as const
}

export const emptyHotel: HotelFormInput = {
  name: '', slug: '', destinationId: '', starRating: '', area: '', description: '', amenityCodes: [],
  checkInTime: '14:00', checkOutTime: '12:00', imageUrl: '', imageAlt: '', images: [], status: 'ACTIVE',
}

/** Chi tiết khách sạn từ API → giá trị trong ô nhập. */
export function hotelToFormValues(hotel: AdminHotelDetailResponse): HotelFormInput {
  return {
    name: hotel.name,
    slug: hotel.slug,
    destinationId: String(hotel.destinationId),
    starRating: String(hotel.starRating),
    area: hotel.area,
    description: hotel.description,
    amenityCodes: hotel.amenities.map((amenity) => amenity.code),
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    imageUrl: hotel.imageUrl,
    imageAlt: hotel.imageAlt,
    images: hotel.images.map(({ url, alt }) => ({ url, alt })),
    status: 'ACTIVE',
  }
}

/** Mọi trường của request sửa; trạng thái đổi bằng thao tác riêng. */
export function toHotelUpdateRequest(values: HotelFormOutput): AdminUpdateHotelRequest {
  return {
    name: values.name, slug: values.slug, destinationId: values.destinationId, starRating: values.starRating,
    area: values.area, description: values.description, amenityCodes: values.amenityCodes,
    checkInTime: values.checkInTime, checkOutTime: values.checkOutTime, imageUrl: values.imageUrl,
    imageAlt: values.imageAlt, images: values.images,
  }
}
