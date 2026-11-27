import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarClock, CircleDollarSign, ClipboardList, Clock3, Map, Plane, UsersRound } from 'lucide-react'
import { lazy, Suspense, useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { ServiceBadge, StatusBadge } from '@/components/common/status-badges'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminBookingPageResponse, AdminDashboardResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'

type DashboardQuery<T> = UseQueryResult<T, unknown>

const DashboardChart = lazy(async () => ({ default: (await import('./dashboard-charts')).DashboardChart }))
const count = new Intl.NumberFormat('vi-VN')
const unpaidLink = '/bookings?status=PENDING&paymentStatus=UNPAID'
const paidLink = '/bookings?status=PENDING&paymentStatus=PAID'
const refundsLink = '/bookings?status=CANCELLED&paymentStatus=PAID'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Card role="region" aria-labelledby={id} className="min-w-0">
      <CardHeader><h2 id={id} className="text-base font-semibold">{title}</h2></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function RowsSkeleton() {
  return (
    <div className="space-y-3 py-2" role="status" aria-label="Đang tải">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-52 w-full" role="status" aria-label="Đang tải biểu đồ" />
}

function QueryContent<T>({ query, loading, children }: {
  query: DashboardQuery<T>
  loading: ReactNode
  children: (data: T) => ReactNode
}) {
  if (query.isError) {
    return <ErrorState message={query.error instanceof ApiError && query.error.status === 403
      ? 'Bạn không có quyền xem số liệu này.' : undefined} onRetry={() => void query.refetch()} />
  }
  return query.isPending ? loading : children(query.data)
}

function MetricsGrid({ data }: { data?: AdminDashboardResponse }) {
  const metrics = [
    { label: 'Doanh thu đã thu', value: data && formatVND(data.revenueCollected), detail: 'Không gồm đơn đã huỷ', Icon: CircleDollarSign },
    { label: 'Đơn mới', value: data && count.format(data.newBookings), Icon: ClipboardList },
    { label: 'Chờ thanh toán', value: data && count.format(data.awaitingPayment), href: unpaidLink, Icon: Clock3 },
    { label: 'Chờ xác nhận', value: data && count.format(data.awaitingConfirmation), href: paidLink, Icon: CalendarClock },
    { label: 'Khách hàng mới', value: data && count.format(data.customers.newCustomers),
      detail: data && `${count.format(data.customers.total)} khách hàng tổng cộng`, Icon: UsersRound },
    { label: 'Tour đang bán', value: data && count.format(data.tours.bookable),
      detail: data && `${count.format(data.tours.active)} đang hiện · ${count.format(data.tours.hidden)} đang ẩn`, Icon: Map },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-busy={!data}>
      {metrics.map(({ label, value, href, detail, Icon }) => {
        const tile = (
          <Card size="sm" className="h-full">
            <CardContent>
              <dl className="space-y-1.5">
                <dt className="flex items-start gap-1.5 text-xs font-medium text-muted-foreground">
                  <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{label}</span>
                  {href && data && <ArrowRight aria-hidden="true" className="ml-auto size-3.5 shrink-0" />}
                </dt>
                <dd className="break-words text-lg font-semibold leading-tight tabular-nums">
                  {data ? value : <Skeleton className="h-6 w-16" />}
                </dd>
                {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
              </dl>
            </CardContent>
          </Card>
        )
        return href && data
          ? <Link key={label} to={href} className="rounded-xl hover:ring-1 hover:ring-primary focus-visible:outline-2 focus-visible:outline-ring">{tile}</Link>
          : <div key={label}>{tile}</div>
      })}
    </div>
  )
}

export function DashboardMetrics({ query }: { query: DashboardQuery<AdminDashboardResponse> }) {
  return (
    <section aria-label="Chỉ số tổng quan" className="space-y-4">
      <QueryContent query={query} loading={<MetricsGrid />}>
        {(data) => (
          <>
            <MetricsGrid data={data} />
            {data.refundPending.count > 0 && (
              <aside aria-label="Cần hoàn tiền" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning-surface px-4 py-3 text-warning">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold">Cần hoàn tiền</h2>
                  <p className="text-sm tabular-nums">
                    {count.format(data.refundPending.count)} đơn · {formatVND(data.refundPending.amount)}
                  </p>
                </div>
                <Link className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" to={refundsLink}>
                  Xem đơn cần hoàn tiền <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </aside>
            )}
          </>
        )}
      </QueryContent>
    </section>
  )
}

export function DashboardSeries({ query, metric }: {
  query: DashboardQuery<AdminDashboardResponse>
  metric: 'revenueCollected' | 'newBookings'
}) {
  const money = metric === 'revenueCollected'
  const title = money ? 'Doanh thu theo ngày' : 'Đơn mới theo ngày'
  const unit = money ? 'VND' : 'Đơn đặt chỗ'
  const format = money ? formatVND : (value: number) => `${count.format(value)} đơn`
  return (
    <Panel title={title}>
      <QueryContent query={query} loading={<ChartSkeleton />}>
        {(data) => {
          if (data[metric] === 0) return (
            <EmptyState title={money ? 'Chưa có doanh thu trong khoảng này' : 'Chưa có đơn mới trong khoảng này'}
              description="Chọn khoảng ngày khác để xem số liệu." />
          )
          const peak = data.daily.reduce((highest, day) => day[metric] > highest[metric] ? day : highest)
          return (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{unit}</p>
              <Suspense fallback={<ChartSkeleton />}>
                <DashboardChart daily={data.daily} metric={metric} label={`${title}, đơn vị ${unit}`} />
              </Suspense>
              <p className="text-sm tabular-nums text-muted-foreground">
                Tổng {format(data[metric])} · Cao nhất {format(peak[metric])} ngày {formatDate(peak.date)}
              </p>
            </div>
          )
        }}
      </QueryContent>
    </Panel>
  )
}

export function DashboardBookingMix({ query }: { query: DashboardQuery<AdminDashboardResponse> }) {
  const services = [
    { key: 'tour', label: 'Tour', Icon: Map },
    { key: 'hotel', label: 'Khách sạn', Icon: BedDouble },
    { key: 'flight', label: 'Vé máy bay', Icon: Plane },
  ] as const
  return (
    <Panel title="Cơ cấu đơn theo dịch vụ">
      <QueryContent query={query} loading={<RowsSkeleton />}>
        {(data) => data.newBookings === 0 ? (
          <EmptyState title="Chưa có đơn theo dịch vụ trong khoảng này" description="Chọn khoảng ngày khác để xem số liệu." />
        ) : (
          <dl className="grid grid-cols-3 gap-2">
            {services.map(({ key, label, Icon }) => (
              <div key={key} className="space-y-1.5 rounded-lg bg-muted/60 p-2 sm:p-3">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />{label}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{count.format(data.newBookingsByKind[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </QueryContent>
    </Panel>
  )
}

export function DashboardTasks({ query }: { query: DashboardQuery<AdminBookingPageResponse> }) {
  return (
    <Panel title="Việc cần làm">
      <QueryContent query={query} loading={<RowsSkeleton />}>
        {({ items }) => items.length === 0 ? (
          <EmptyState title="Không có đơn chờ xử lý" description="Các đơn mới sẽ xuất hiện ở đây." />
        ) : (
          <ul className="divide-y">
            {items.map((booking) => (
              <li key={booking.code} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                <div className="space-y-0.5">
                  <Link className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    to={`/bookings/${booking.code}`}>{booking.code}</Link>
                  <p className="text-xs tabular-nums text-muted-foreground">{formatDateTime(booking.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ServiceBadge kind={booking.kind} />
                  <StatusBadge group="payment" value={booking.paymentStatus} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryContent>
    </Panel>
  )
}

export function DashboardDepartures({ query }: { query: DashboardQuery<AdminDashboardResponse> }) {
  return (
    <Panel title="Chuyến sắp khởi hành">
      <p className="mb-2 text-xs text-muted-foreground">14 ngày tới</p>
      <QueryContent query={query} loading={<RowsSkeleton />}>
        {({ upcomingDepartures }) => upcomingDepartures.length === 0 ? (
          <EmptyState title="Không có chuyến sắp khởi hành" description="Lịch của các tour đang hiện sẽ xuất hiện ở đây." />
        ) : (
          <ul className="divide-y">
            {upcomingDepartures.map((departure) => {
              const { id, tourId, tourTitle, departureDate, bookedSeats, totalSeats, state } = departure
              const date = formatDate(departureDate)
              return (
                <li key={id} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <Link className="min-w-0 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      to={`/tours/${tourId}?tab=departures`}>{tourTitle}</Link>
                    <StatusBadge group="departure" value={state} />
                  </div>
                  <div className="flex justify-between gap-1.5 text-xs tabular-nums text-muted-foreground">
                    <time dateTime={departureDate}>{date}</time>
                    <span>{count.format(bookedSeats)} / {count.format(totalSeats)} chỗ</span>
                  </div>
                  <Progress value={100 * bookedSeats / totalSeats} aria-label={`Tỷ lệ lấp đầy ${tourTitle}, ${date}`}
                    getValueLabel={() => `${bookedSeats} trên ${totalSeats} chỗ đã đặt`} />
                </li>
              )
            })}
          </ul>
        )}
      </QueryContent>
    </Panel>
  )
}
