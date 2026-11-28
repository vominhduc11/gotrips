import { z } from 'zod'
import type { ListAdminBankTransactionsParams } from '@/lib/api/generated/model'

/**
 * Bộ lọc danh sách giao dịch ngân hàng lưu trên URL. Mặc định mở "Cần xử lý" vì đó là việc nhân viên phải làm; giá trị
 * mặc định không ghi lên URL để liên kết từ menu luôn gọn.
 */
const schema = z.object({
  tab: z.enum(['review', 'done', 'all']).catch('review'),
  // Giới hạn 100 ký tự khớp @Size của API (AdminBankTransactionFilters.q).
  q: z.string().trim().max(100).catch(''),
  page: z.coerce.number().int().min(1).max(2147483647).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(20),
})

export type PaymentFilters = z.infer<typeof schema>
export type PaymentTab = PaymentFilters['tab']

export function parsePaymentFilters(params: URLSearchParams): PaymentFilters {
  return schema.parse(Object.fromEntries(params))
}

export function buildPaymentSearch(filters: PaymentFilters) {
  const params = new URLSearchParams()
  const defaults = parsePaymentFilters(new URLSearchParams())
  for (const [key, value] of Object.entries(filters)) {
    if (value !== defaults[key as keyof PaymentFilters]) params.set(key, String(value))
  }
  return params
}

const needsReviewByTab: Record<PaymentTab, boolean | undefined> = { review: true, done: false, all: undefined }

export function paymentApiParams(filters: PaymentFilters): ListAdminBankTransactionsParams {
  const { tab, q, ...params } = filters
  return { ...params, needsReview: needsReviewByTab[tab], q: q || undefined }
}

export const paymentTabs: readonly { key: PaymentTab; label: string }[] = [
  { key: 'review', label: 'Cần xử lý' },
  { key: 'done', label: 'Không cần xử lý' },
  { key: 'all', label: 'Tất cả' },
]

/** Liên kết từ trang chi tiết đơn: mọi giao dịch có mã đơn này (tìm theo mã đơn, kể cả giao dịch đã xử lý). */
export function paymentsOfBookingHref(code: string) {
  return `/payments?${buildPaymentSearch({ ...parsePaymentFilters(new URLSearchParams()), tab: 'all', q: code })}`
}
