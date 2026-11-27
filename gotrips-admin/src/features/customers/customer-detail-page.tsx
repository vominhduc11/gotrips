import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CopyButton } from '@/components/common/copy-button'
import { DataTable } from '@/components/common/data-table'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { bookingColumns } from '@/features/bookings/booking-columns'
import { getGetAdminCustomerQueryOptions, getListAdminBookingsQueryOptions } from '@/lib/api/generated/api'
import type { AdminBookingSummaryResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatDateTime, formatVND } from '@/lib/format'
import { buildCustomerSearch, isCustomerId, parseCustomerBookingPage } from './customer-filters'

const columns = bookingColumns.filter((column) => column.id !== 'actions')
const emptyBookings: AdminBookingSummaryResponse[] = []

function CustomerBookings({ id }: { id: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, size } = parseCustomerBookingPage(searchParams)
  // Trang hồ sơ hiện cả đơn đã xác nhận và đã huỷ, nên không dùng bộ lọc PENDING mặc định của trang đơn.
  const query = useQuery(getListAdminBookingsQueryOptions({ customerId: id, page, size }, {
    query: { placeholderData: keepPreviousData },
  }))
  const serverPage = query.isPlaceholderData ? undefined : query.data?.page
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== page) {
      setSearchParams(buildCustomerSearch({ page: serverPage, size }), { replace: true })
    }
  }, [page, serverPage, setSearchParams, size])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Đơn đặt chỗ</h2>
      <DataTable label="Đơn đặt chỗ của khách" columns={columns} rows={query.data?.items ?? emptyBookings}
        getRowId={(booking) => booking.code}
        pagination={{ pageIndex: (serverPage ?? page) - 1, pageSize: size }}
        rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => setSearchParams(buildCustomerSearch({ page: pageIndex + 1, size: pageSize }))}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle="Khách hàng chưa có đơn đặt chỗ"
        onRetry={() => void query.refetch()} />
    </section>
  )
}

export function CustomerDetailPage() {
  const { id = '' } = useParams()
  const validId = isCustomerId(id)
  const query = useQuery(getGetAdminCustomerQueryOptions(id, { query: { enabled: validId } }))

  if (!validId || (query.error instanceof ApiError && query.error.status === 404)) {
    return <section className="space-y-3">
      <PageHeader title="Không tìm thấy khách hàng" />
      <Button variant="outline" asChild><Link to="/customers">Về danh sách khách hàng</Link></Button>
    </section>
  }
  if (query.isError) return <section className="space-y-3">
    <PageHeader title={query.error instanceof ApiError && query.error.status === 403 ? 'Bạn không có quyền' : 'Không tải được hồ sơ khách hàng'} />
    <ErrorState message={apiErrorMessage(query.error) ?? undefined} onRetry={() => void query.refetch()} />
  </section>
  if (!query.data) return (
    <div aria-label="Đang tải hồ sơ khách hàng" aria-busy="true" className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  )

  const customer = query.data
  return (
    <section className="space-y-5">
      <PageHeader title={customer.fullName} />
      <Card>
        <CardHeader><CardTitle>Hồ sơ khách hàng</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="flex flex-wrap items-center gap-1 break-all">{customer.email}
                <CopyButton value={customer.email} label="Sao chép email" />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ngày tham gia</dt>
              <dd><time dateTime={customer.createdAt}>{formatDateTime(customer.createdAt)}</time></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lần đặt gần nhất</dt>
              <dd>{customer.lastBookingAt ? formatDateTime(customer.lastBookingAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Số đơn</dt>
              <dd className="text-lg font-semibold tabular-nums">{customer.bookingCount.toLocaleString('vi-VN')}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tổng đã thanh toán</dt>
              <dd className="text-lg font-semibold tabular-nums">{formatVND(customer.totalPaid)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <CustomerBookings key={id} id={id} />
    </section>
  )
}
