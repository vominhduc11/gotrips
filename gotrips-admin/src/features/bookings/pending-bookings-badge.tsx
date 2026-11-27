import { useQuery } from '@tanstack/react-query'
import { SidebarMenuBadge } from '@/components/ui/sidebar'
import { getListAdminBookingsQueryOptions } from '@/lib/api/generated/api'
import { bookingRefreshOptions } from './booking-refresh'

export function PendingBookingsBadge() {
  const { data } = useQuery(getListAdminBookingsQueryOptions({ status: 'PENDING', size: 1 }, {
    query: bookingRefreshOptions,
  }))
  if (data?.totalItems === undefined) return null
  return (
    <SidebarMenuBadge className="tabular-nums" aria-label={`${data.totalItems} đơn chờ xử lý`}>
      {data.totalItems > 999 ? '999+' : data.totalItems}
    </SidebarMenuBadge>
  )
}
