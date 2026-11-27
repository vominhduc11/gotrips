// Địa chỉ website khách, chỉ dùng cho liên kết "Xem trên website". Vite nhúng giá trị lúc build.
const WEB_URL = (import.meta.env.VITE_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '')

export function websiteTourUrl(slug: string) {
  return `${WEB_URL}/tours/${encodeURIComponent(slug)}`
}

export function websiteHotelUrl(slug: string) {
  return `${WEB_URL}/hotels/${encodeURIComponent(slug)}`
}
