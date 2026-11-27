import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { adminMeOptions } from '@/features/auth/session'
import { bookingRefreshOptions } from '@/features/bookings/booking-refresh'
import { getGetAdminDashboardQueryOptions, getListAdminBookingsQueryOptions } from '@/lib/api/generated/api'
import { getTodayInVietnam } from '@/lib/format'
import { buildDashboardSearch, dashboardDates, parseDashboardRange } from './dashboard-filters'
import { DashboardRangeControls } from './dashboard-range-controls'
import { DashboardBookingMix, DashboardDepartures, DashboardMetrics, DashboardSeries, DashboardTasks } from './dashboard-sections'

function useDashboardToday() {
  const [today, setToday] = useState(getTodayInVietnam)
  useEffect(() => {
    // Tab mở qua đêm phải tự chuyển khoảng 7/30/90 ngày sang ngày mới.
    const update = () => setToday(getTodayInVietnam())
    const timer = window.setInterval(update, bookingRefreshOptions.refetchInterval)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return today
}

export function DashboardPage() {
  const { data: user } = useQuery(adminMeOptions())
  const [params, setParams] = useSearchParams()
  const today = useDashboardToday()
  const range = parseDashboardRange(params, today)
  const dates = dashboardDates(range, today)
  const dashboard = useQuery(getGetAdminDashboardQueryOptions(dates, { query: bookingRefreshOptions }))
  const tasks = useQuery(getListAdminBookingsQueryOptions({ status: 'PENDING', sort: 'CREATED_ASC', size: 5 },
    { query: bookingRefreshOptions }))

  return (
    <section className="min-w-0 space-y-4">
      <PageHeader title="Tổng quan" description={user && `Xin chào, ${user.fullName}.`}
        action={<DashboardRangeControls value={range} today={today} dates={dates}
          onChange={(next) => setParams(buildDashboardSearch(next))} />} />
      <DashboardMetrics query={dashboard} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-4">
          <DashboardTasks query={tasks} />
          <DashboardDepartures query={dashboard} />
        </div>
        <div className="min-w-0 space-y-4">
          <DashboardSeries query={dashboard} metric="revenueCollected" />
          <DashboardSeries query={dashboard} metric="newBookings" />
          <DashboardBookingMix query={dashboard} />
        </div>
      </div>
    </section>
  )
}
