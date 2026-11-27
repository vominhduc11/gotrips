import { z } from 'zod'

export const MAX_IMAGES = 20

/** Giới hạn và câu chữ khớp `AdminImageRequest` và `AdminHotelRules` của API: đổi một nơi phải đổi nơi kia. */
export const imageSchema = z.object({
  url: z.string().trim().min(1, 'Vui lòng nhập địa chỉ ảnh.').max(500, 'Địa chỉ ảnh không được quá 500 ký tự.'),
  alt: z.string().trim().min(1, 'Vui lòng nhập mô tả ảnh.').max(255, 'Mô tả ảnh không được quá 255 ký tự.'),
})

export type ImageValue = z.infer<typeof imageSchema>

export const imageListSchema = z.array(imageSchema).max(MAX_IMAGES, 'Bộ ảnh có tối đa 20 ảnh.')

/** Báo sớm ảnh lặp; URL thuộc nguồn được phép hay không do API quyết định. */
export function checkGallery(images: ImageValue[], mainImageUrl: string | null, ctx: z.RefinementCtx) {
  const seen = new Set<string>()
  images.forEach((image, index) => {
    const message = image.url === mainImageUrl
      ? 'Bộ ảnh xem thêm không lặp lại ảnh đại diện.'
      : seen.has(image.url) ? 'Ảnh này đã có trong bộ ảnh.' : null
    if (message) ctx.addIssue({ code: 'custom', path: ['images', index, 'url'], message })
    seen.add(image.url)
  })
}

/** Tên ô của từng ảnh theo thứ tự trên màn hình, để lỗi API (`images[1].url`) tìm được ô. */
export function imageFields(count: number) {
  return Array.from({ length: count }, (_, index) => [`images.${index}.url`, `images.${index}.alt`] as const).flat()
}
