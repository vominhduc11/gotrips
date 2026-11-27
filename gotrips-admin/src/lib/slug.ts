/** Khớp CHECK của DB và `CatalogSlugs.PATTERN` của API: đổi một nơi phải đổi nơi kia. */
export const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const slugPatternMessage = 'Slug chỉ gồm chữ thường không dấu và số, nối với nhau bằng một dấu gạch ngang.'

/** Bỏ dấu tiếng Việt và đưa về chữ thường (dùng cho slug và tìm kiếm không phân biệt dấu). */
export function removeDiacritics(text: string) {
  // NFD tách dấu thành ký tự riêng để bỏ đi. "đ" không tách được nên đổi tay.
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase()
}

/** "Đà Lạt 3N2Đ – Săn mây" → "da-lat-3n2d-san-may", cắt ở `maxLength` mà không để lại gạch ngang cuối. */
export function slugify(text: string, maxLength: number) {
  return removeDiacritics(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, maxLength)
    .replace(/-+$/, '')
}
