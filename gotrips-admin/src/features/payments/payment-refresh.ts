import type { QueryClient } from '@tanstack/react-query'
import {
  getGetAdminBookingQueryKey, getGetAdminDashboardQueryKey, getListAdminBankTransactionsQueryKey,
  getListAdminBookingsQueryKey, getListAdminCustomersQueryKey,
} from '@/lib/api/generated/api'

/**
 * Gắn hay xử lý một giao dịch có thể làm đơn đủ tiền và tự xác nhận, nên mọi nơi hiện đơn, số liệu và tổng chi của khách
 * đều phải lấy lại. Khoá gốc của Orval (không tham số) khớp mọi biến thể của danh sách.
 */
export function refreshAfterTransactionChange(client: QueryClient, bookingCode: string | null) {
  return Promise.all([
    client.invalidateQueries({ queryKey: getListAdminBankTransactionsQueryKey() }),
    client.invalidateQueries({ queryKey: getListAdminBookingsQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
    client.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() }),
    // Hồ sơ khách có tổng đã chi. Giao dịch không mang id khách, còn khoá Orval của hồ sơ là một chuỗi
    // `/admin/customers/{id}` (không chung tiền tố với danh sách), nên lọc theo chuỗi để làm mới mọi hồ sơ.
    client.invalidateQueries({
      predicate: ({ queryKey: [first] }) => typeof first === 'string' && first.startsWith('/admin/customers/'),
    }),
    ...(bookingCode ? [client.invalidateQueries({ queryKey: getGetAdminBookingQueryKey(bookingCode) })] : []),
  ])
}
