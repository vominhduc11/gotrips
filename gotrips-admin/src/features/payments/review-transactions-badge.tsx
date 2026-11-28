import { useQuery } from '@tanstack/react-query'
import { SidebarMenuBadge } from '@/components/ui/sidebar'
import { getListAdminBankTransactionsQueryOptions } from '@/lib/api/generated/api'
import { bookingRefreshOptions } from '@/features/bookings/booking-refresh'

/** Số giao dịch đang chờ nhân viên xử lý (cỡ trang 1: chỉ cần tổng số). */
export function ReviewTransactionsBadge() {
  const { data } = useQuery(getListAdminBankTransactionsQueryOptions({ needsReview: true, size: 1 }, {
    query: bookingRefreshOptions,
  }))
  // Không hiện "0": huy hiệu chỉ để gây chú ý khi có việc.
  if (!data?.totalItems) return null
  return (
    <SidebarMenuBadge className="tabular-nums" aria-label={`${data.totalItems} giao dịch cần xử lý`}>
      {data.totalItems > 999 ? '999+' : data.totalItems}
    </SidebarMenuBadge>
  )
}
