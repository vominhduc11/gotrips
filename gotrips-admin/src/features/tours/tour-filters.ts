import type { SortingState } from '@tanstack/react-table'
import { z } from 'zod'

/** Trạng thái bảng tour nằm trên URL; giá trị sai thì về mặc định. */
const schema = z.object({
  q: z.string().trim().max(150).catch(''),
  destinationId: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).optional().catch(undefined),
  /** Bỏ trống = đang hiện và đang ẩn; tour đã xoá chỉ hiện khi chọn rõ. */
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED']).optional().catch(undefined),
  featured: z.enum(['true', 'false']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(2147483647).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z.enum(['NEWEST', 'OLDEST', 'TITLE_ASC', 'TITLE_DESC']).catch('NEWEST'),
})

export type TourFilters = z.infer<typeof schema>

export function parseTourFilters(params: URLSearchParams): TourFilters {
  return schema.parse(Object.fromEntries(params))
}

export const defaultTourFilters = parseTourFilters(new URLSearchParams())

export function buildTourSearch(filters: TourFilters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== defaultTourFilters[key as keyof TourFilters]) {
      params.set(key, String(value))
    }
  }
  return params
}

export function tourApiParams({ q, featured, ...filters }: TourFilters) {
  return { ...filters, q: q || undefined, featured: featured === undefined ? undefined : featured === 'true' }
}

export function hasActiveTourFilters({ q, destinationId, status, featured }: TourFilters) {
  return !!(q || destinationId || status || featured)
}

/** Chỉ cột Tour sắp xếp được theo tên; "mới nhất/cũ nhất" chọn ở ô sắp xếp. */
export function tourTableSorting(sort: TourFilters['sort']): SortingState {
  return sort === 'TITLE_ASC' || sort === 'TITLE_DESC' ? [{ id: 'title', desc: sort === 'TITLE_DESC' }] : []
}

export function tourSortFromTable(sorting: SortingState): TourFilters['sort'] {
  const column = sorting[0]
  if (!column) return 'NEWEST'
  return column.desc ? 'TITLE_DESC' : 'TITLE_ASC'
}
