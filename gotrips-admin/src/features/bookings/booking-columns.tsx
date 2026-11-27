import { Link } from 'react-router'
import type { DataTableColumn } from '@/components/common/data-table'
import { ServiceBadge, StatusBadge } from '@/components/common/status-badges'
import type { AdminBookingSummaryResponse } from '@/lib/api/generated/model'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { BookingActions } from './booking-actions'

function service(booking: AdminBookingSummaryResponse) {
  if (booking.tour) return { name: booking.tour.tourTitle, dates: formatDate(booking.tour.departureDate) }
  if (booking.hotel) return {
    name: booking.hotel.hotelName,
    dates: `${formatDate(booking.hotel.checkIn)} – ${formatDate(booking.hotel.checkOut)}`,
  }
  const segments = booking.flight?.segments ?? []
  return {
    name: segments.map((segment) => `${segment.from.code} → ${segment.to.code}`).join(' · '),
    dates: segments.map((segment) => formatDate(segment.date)).join(' · '),
  }
}

export const bookingColumns: DataTableColumn<AdminBookingSummaryResponse>[] = [
  { accessorKey: 'code', header: 'Mã đơn', enableSorting: false,
    cell: ({ row }) => <Link to={`/bookings/${row.original.code}`}
      className="font-mono font-medium text-primary hover:underline">{row.original.code}</Link> },
  { id: 'service', header: 'Dịch vụ', cell: ({ row }) => {
    const { name, dates } = service(row.original)
    return <div className="flex min-w-44 flex-col items-start gap-1 py-1">
      <ServiceBadge kind={row.original.kind} />
      <span className="font-medium">{name}</span>
      <span className="text-xs text-muted-foreground">{dates}</span>
    </div>
  } },
  { id: 'contact', header: 'Người liên hệ', cell: ({ row }) => {
    const { fullName, email, phone } = row.original.contact
    return <div className="flex flex-col">
      <span>{fullName}</span>
      <span className="text-xs text-muted-foreground">{email}</span>
      <span className="text-xs text-muted-foreground">{phone}</span>
    </div>
  } },
  { accessorKey: 'totalAmount', header: 'Tổng tiền',
    cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatVND(row.original.totalAmount)}</div> },
  { id: 'status', header: 'Trạng thái đơn', cell: ({ row }) => <StatusBadge group="booking" value={row.original.status} /> },
  { id: 'paymentStatus', header: 'Thanh toán',
    cell: ({ row }) => <StatusBadge group="payment" value={row.original.paymentStatus} /> },
  { accessorKey: 'createdAt', header: 'Ngày tạo',
    cell: ({ row }) => <span className="tabular-nums">{formatDateTime(row.original.createdAt)}</span> },
  { id: 'actions', header: 'Thao tác', cell: ({ row }) => <BookingActions booking={row.original} inMenu /> },
]
