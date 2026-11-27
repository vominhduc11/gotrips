import { z } from 'zod'
import { slugPattern, slugPatternMessage } from '@/lib/slug'

export const TOUR_SLUG_MAX_LENGTH = 150
export const SHORT_DESCRIPTION_MAX_LENGTH = 500

const required = (message: string, max: number, tooLong: string) =>
  z.string().trim().min(1, message).max(max, tooLong)

/** Ô số giữ chữ trong lúc nhập (ô trống vẫn là trống, không thành 0), đổi sang số khi form hợp lệ. */
const wholeNumber = (requiredMessage: string, min: number, max: number, rangeMessage: string) =>
  z.string().trim().min(1, requiredMessage)
    .refine((value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max, rangeMessage)
    .transform(Number)

/**
 * Chỉ để báo lỗi sớm. Giới hạn và câu chữ khớp `AdminTourRules` + `AdminCreateTourRequest` của API: đổi một nơi phải
 * đổi nơi kia. Slug trùng, điểm đến đã mất và nguồn ảnh được phép do API kiểm.
 */
export const tourFormSchema = z.object({
  title: required('Vui lòng nhập tên tour.', 255, 'Tên tour không được quá 255 ký tự.'),
  slug: required('Vui lòng nhập slug.', TOUR_SLUG_MAX_LENGTH, 'Slug không được quá 150 ký tự.')
    .regex(slugPattern, slugPatternMessage)
    .refine((slug) => slug !== 'featured', 'Slug này được hệ thống dùng riêng. Hãy chọn slug khác.'),
  destinationId: z.string().min(1, 'Vui lòng chọn điểm đến.').transform(Number),
  durationDays: wholeNumber('Vui lòng nhập số ngày.', 1, 365, 'Số ngày phải từ 1 đến 365.'),
  durationNights: wholeNumber('Vui lòng nhập số đêm.', 0, 365, 'Số đêm phải từ 0 đến 365.'),
  departureCity: required('Vui lòng nhập nơi khởi hành.', 100, 'Nơi khởi hành không được quá 100 ký tự.'),
  shortDescription: required('Vui lòng nhập giới thiệu ngắn.', SHORT_DESCRIPTION_MAX_LENGTH,
    'Giới thiệu ngắn không được quá 500 ký tự.'),
  coverImageUrl: required('Vui lòng nhập địa chỉ ảnh.', 500, 'Địa chỉ ảnh không được quá 500 ký tự.'),
  coverImageAlt: required('Vui lòng nhập mô tả ảnh.', 255, 'Mô tả ảnh không được quá 255 ký tự.'),
  featured: z.boolean(),
  /** Chỉ form tạo dùng; tour đã có thì đổi trạng thái bằng thao tác riêng. */
  status: z.enum(['ACTIVE', 'HIDDEN']),
}).refine((tour) => tour.durationNights <= tour.durationDays, {
  path: ['durationNights'],
  message: 'Số đêm không được lớn hơn số ngày.',
})

export type TourFormInput = z.input<typeof tourFormSchema>
export type TourFormOutput = z.output<typeof tourFormSchema>

/** Thứ tự ô trên form: ô lỗi đầu tiên theo thứ tự này được focus. */
export const tourFormFields = [
  'title', 'slug', 'destinationId', 'durationDays', 'durationNights', 'departureCity', 'shortDescription',
  'coverImageUrl', 'coverImageAlt', 'featured', 'status',
] as const

export const emptyTour: TourFormInput = {
  title: '', slug: '', destinationId: '', durationDays: '', durationNights: '', departureCity: '',
  shortDescription: '', coverImageUrl: '', coverImageAlt: '', featured: false, status: 'ACTIVE',
}

/** Chi tiết tour từ API → giá trị trong ô nhập. */
export function tourToFormValues(tour: {
  title: string, slug: string, destinationId: number, durationDays: number, durationNights: number,
  departureCity: string, shortDescription: string, coverImageUrl: string, coverImageAlt: string, featured: boolean,
}): TourFormInput {
  return {
    title: tour.title,
    slug: tour.slug,
    destinationId: String(tour.destinationId),
    durationDays: String(tour.durationDays),
    durationNights: String(tour.durationNights),
    departureCity: tour.departureCity,
    shortDescription: tour.shortDescription,
    coverImageUrl: tour.coverImageUrl,
    coverImageAlt: tour.coverImageAlt,
    featured: tour.featured,
    status: 'ACTIVE',
  }
}
