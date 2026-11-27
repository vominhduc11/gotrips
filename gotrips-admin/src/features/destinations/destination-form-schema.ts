import { z } from 'zod'
import { slugPattern, slugPatternMessage } from '@/lib/slug'

/** Website bỏ qua bộ lọc điểm đến dài hơn (khớp `AdminDestinationRequest.SLUG_MAX_LENGTH`). */
export const DESTINATION_SLUG_MAX_LENGTH = 60

const required = (message: string, max: number, tooLong: string) =>
  z.string().trim().min(1, message).max(max, tooLong)

/**
 * Chỉ để báo lỗi sớm. Giới hạn và câu chữ khớp `AdminDestinationRequest` của API: đổi một nơi phải đổi nơi kia.
 * Nguồn ảnh được phép do API kiểm (cấu hình được).
 */
export const destinationFormSchema = z.object({
  name: required('Vui lòng nhập tên điểm đến.', 150, 'Tên không được quá 150 ký tự.'),
  slug: required('Vui lòng nhập slug.', DESTINATION_SLUG_MAX_LENGTH, 'Slug không được quá 60 ký tự.')
    .regex(slugPattern, slugPatternMessage),
  region: required('Vui lòng nhập vùng.', 100, 'Vùng không được quá 100 ký tự.'),
  imageUrl: required('Vui lòng nhập địa chỉ ảnh.', 500, 'Địa chỉ ảnh không được quá 500 ký tự.'),
  imageAlt: required('Vui lòng nhập mô tả ảnh.', 255, 'Mô tả ảnh không được quá 255 ký tự.'),
})

export type DestinationFormValues = z.infer<typeof destinationFormSchema>

/** Thứ tự ô trên form: ô lỗi đầu tiên theo thứ tự này được focus. */
export const destinationFormFields = ['name', 'slug', 'region', 'imageUrl', 'imageAlt'] as const
