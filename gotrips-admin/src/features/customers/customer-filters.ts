import { z } from 'zod'
import type { ListAdminCustomersParams } from '@/lib/api/generated/model'

export const customerSorts = ['CREATED_DESC', 'NAME_ASC', 'PAID_DESC'] as const
export const customerSortLabels: Record<(typeof customerSorts)[number], string> = {
  CREATED_DESC: 'Mới tham gia',
  NAME_ASC: 'Tên A → Z',
  PAID_DESC: 'Đã thanh toán cao nhất',
}

const pageSchema = z.object({
  page: z.coerce.number<string>().int().min(1).max(2_147_483_647).catch(1),
  size: z.coerce.number<string>().int().min(1).max(100).catch(20),
})
const listSchema = pageSchema.extend({
  q: z.string().trim().max(254).catch(''),
  sort: z.enum(customerSorts).catch('CREATED_DESC'),
})
const idSchema = z.guid()

export type CustomerFilters = z.infer<typeof listSchema>

export function parseCustomerFilters(params: URLSearchParams) {
  return listSchema.parse(Object.fromEntries(params))
}

export function parseCustomerBookingPage(params: URLSearchParams) {
  return pageSchema.parse(Object.fromEntries(params))
}

export function buildCustomerSearch(values: Partial<CustomerFilters>) {
  const params = new URLSearchParams()
  if (values.q) params.set('q', values.q)
  if (values.sort && values.sort !== 'CREATED_DESC') params.set('sort', values.sort)
  if (values.page !== undefined && values.page !== 1) params.set('page', String(values.page))
  if (values.size !== undefined && values.size !== 20) params.set('size', String(values.size))
  return params
}

export function customerApiParams(filters: CustomerFilters): ListAdminCustomersParams {
  return { ...filters, q: filters.q || undefined }
}

export function isCustomerId(id: string) {
  // Orval ghép tham số đường dẫn trực tiếp. UUID sai định dạng phải dừng tại trang 404.
  return idSchema.safeParse(id).success
}
