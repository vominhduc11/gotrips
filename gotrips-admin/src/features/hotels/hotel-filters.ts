import type { SortingState } from '@tanstack/react-table'
import { z } from 'zod'

/** Trạng thái bảng khách sạn nằm trên URL; giá trị sai thì về mặc định. */
const schema = z.object({
  q: z.string().trim().max(200).catch(''),
  destinationId: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional().catch(undefined),
  /** Bỏ trống = đang hiện và đang ẩn; khách sạn đã xoá chỉ hiện khi chọn rõ. */
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(2147483647).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z.enum(['NEWEST', 'OLDEST', 'NAME_ASC', 'NAME_DESC']).catch('NEWEST'),
})

export type HotelFilters = z.infer<typeof schema>

export function parseHotelFilters(params: URLSearchParams): HotelFilters {
  return schema.parse(Object.fromEntries(params))
}

export const defaultHotelFilters = parseHotelFilters(new URLSearchParams())

export function buildHotelSearch(filters: HotelFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== defaultHotelFilters[key as keyof HotelFilters]) {
      params.set(key, String(value))
    }
  }
  return params
}

export function hotelApiParams({ q, ...filters }: HotelFilters) {
  return { ...filters, q: q || undefined }
}

export function hasActiveHotelFilters({ q, destinationId, status }: HotelFilters) {
  return !!(q || destinationId || status)
}

/** Chỉ cột Khách sạn sắp xếp được theo tên; "mới nhất/cũ nhất" chọn ở ô sắp xếp. */
export function hotelTableSorting(sort: HotelFilters['sort']): SortingState {
  return sort === 'NAME_ASC' || sort === 'NAME_DESC' ? [{ id: 'name', desc: sort === 'NAME_DESC' }] : []
}

export function hotelSortFromTable(sorting: SortingState): HotelFilters['sort'] {
  const column = sorting[0]
  if (!column) return 'NEWEST'
  return column.desc ? 'NAME_DESC' : 'NAME_ASC'
}
