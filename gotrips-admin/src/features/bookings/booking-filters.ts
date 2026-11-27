import type { SortingState } from '@tanstack/react-table'
import { z } from 'zod'
import type { ListAdminBookingsParams } from '@/lib/api/generated/model'

const schema = z.object({
  q: z.string().trim().max(254).catch(''),
  kind: z.enum(['TOUR', 'HOTEL', 'FLIGHT']).optional().catch(undefined),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'ALL']).catch('PENDING'),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'CANCELLED']).optional().catch(undefined),
  createdFrom: z.iso.date().optional().catch(undefined),
  createdTo: z.iso.date().optional().catch(undefined),
  customerId: z.uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(2147483647).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z.enum(['CREATED_DESC', 'CREATED_ASC', 'TOTAL_DESC', 'TOTAL_ASC']).catch('CREATED_DESC'),
})

export type BookingFilters = z.infer<typeof schema>

export function parseBookingFilters(params: URLSearchParams): BookingFilters {
  const filters = schema.parse(Object.fromEntries(params))
  if (filters.createdFrom && filters.createdTo && filters.createdTo < filters.createdFrom) filters.createdTo = undefined
  return filters
}

export function buildBookingSearch(filters: BookingFilters) {
  const params = new URLSearchParams()
  const defaults = parseBookingFilters(new URLSearchParams())
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== defaults[key as keyof BookingFilters]) params.set(key, String(value))
  }
  return params
}

export function bookingApiParams(filters: BookingFilters): ListAdminBookingsParams {
  const { q, status, ...params } = filters
  return { ...params, q: q || undefined, status: status === 'ALL' ? undefined : status }
}

export const bookingTabs = [
  { key: 'pending', label: 'Cần xử lý', status: 'PENDING', paymentStatus: undefined },
  { key: 'unpaid', label: 'Chờ thanh toán', status: 'PENDING', paymentStatus: 'UNPAID' },
  { key: 'paid', label: 'Chờ xác nhận', status: 'PENDING', paymentStatus: 'PAID' },
  { key: 'confirmed', label: 'Đã xác nhận', status: 'CONFIRMED', paymentStatus: undefined },
  { key: 'cancelled', label: 'Đã huỷ', status: 'CANCELLED', paymentStatus: undefined },
  { key: 'all', label: 'Tất cả', status: 'ALL', paymentStatus: undefined },
] as const

export function activeBookingTab(filters: BookingFilters) {
  return bookingTabs.find((tab) => tab.status === filters.status && tab.paymentStatus === filters.paymentStatus)?.key
}

export function isBookingCode(code: string) {
  // Orval ghép mã thẳng vào đường dẫn. Cần khớp định dạng BookingCodeGenerator của API.
  return /^GT[2-9A-HJKMNP-Z]{6}$/.test(code)
}

export function tableSorting(sort: BookingFilters['sort']): SortingState {
  return [{ id: sort.startsWith('TOTAL') ? 'totalAmount' : 'createdAt', desc: sort.endsWith('DESC') }]
}

export function bookingSort(sorting: SortingState): BookingFilters['sort'] {
  const column = sorting[0]
  if (!column) return 'CREATED_DESC'
  if (column.id === 'totalAmount') return column.desc ? 'TOTAL_DESC' : 'TOTAL_ASC'
  return column.desc ? 'CREATED_DESC' : 'CREATED_ASC'
}
