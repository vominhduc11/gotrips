import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { CopyButton } from '@/components/common/copy-button'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { ServiceBadge, StatusBadge } from '@/components/common/status-badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getGetAdminBookingQueryOptions } from '@/lib/api/generated/api'
import type { AdminBookingDetailResponse, CabinClass, PassengerType } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { formatDate, formatDateTime, formatVND } from '@/lib/format'
import { BookingTransactions } from '@/features/payments/booking-transactions'
import { paymentsOfBookingHref } from '@/features/payments/payment-filters'
import { BookingActions } from './booking-actions'
import { isBookingCode } from './booking-filters'

const cabinLabels: Record<CabinClass, string> = {
  ECONOMY: 'Phổ thông', PREMIUM_ECONOMY: 'Phổ thông đặc biệt', BUSINESS: 'Thương gia', FIRST: 'Hạng nhất',
}

const passengerLabels: Record<PassengerType, string> = {
  ADULT: 'Người lớn', CHILD: 'Trẻ em', INFANT: 'Em bé',
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Values({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-x-4 gap-y-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 wrap-break-word font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ServiceDetails({ booking }: { booking: AdminBookingDetailResponse }) {
  const { tour, hotel, flight } = booking
  if (tour) return <DetailCard title="Thông tin tour">
    <Values items={[
      ['Tên tour', tour.tourTitle], ['Chuyến khởi hành', formatDate(tour.departureDate)],
      ['Nơi khởi hành', tour.departureCity], ['Số khách', tour.guests], ['Đơn giá mỗi khách', formatVND(tour.unitPrice)],
    ]} />
  </DetailCard>
  if (hotel) return <DetailCard title="Thông tin lưu trú">
    <Values items={[
      ['Khách sạn', hotel.hotelName], ['Loại phòng', hotel.roomTypeName],
      ['Nhận phòng', `${formatDate(hotel.checkIn)} · ${hotel.checkInTime}`],
      ['Trả phòng', `${formatDate(hotel.checkOut)} · ${hotel.checkOutTime}`],
      ['Số đêm', hotel.nights], ['Số phòng', hotel.rooms], ['Số khách', hotel.guests],
      ['Giá mỗi phòng mỗi đêm', formatVND(hotel.pricePerNight)], ['Người nhận phòng', hotel.guestName],
    ]} />
  </DetailCard>
  if (!flight) return null
  return (
    <DetailCard title="Thông tin chuyến bay">
      <div className="space-y-4">
        <Values items={[[ 'Hạng ghế', cabinLabels[flight.cabin] ]]} />
        {flight.segments.map((segment, index) => (
          <div key={`${segment.scheduleId}-${index}`} className="space-y-2 rounded-md border p-3">
            <h3 className="font-medium">{index === 0 ? 'Chiều đi' : 'Chiều về'} · {segment.from.code} → {segment.to.code}</h3>
            <Values items={[
              ['Chuyến bay', segment.flightNumber],
              ['Ngày bay', formatDate(segment.date)],
              ['Giờ bay', `${segment.departTime} → ${segment.arriveTime}${segment.arrivesNextDay ? ' (+1 ngày)' : ''}`],
            ]} />
            <ul className="space-y-1 border-t pt-2 text-sm tabular-nums">
              {flight.priceLines.filter((line) => line.segmentIndex === index).map((line) => (
                <li key={line.passengerType} className="flex flex-wrap justify-between gap-x-4">
                  <span>{passengerLabels[line.passengerType]} · {line.quantity} × {formatVND(line.unitPrice)}</span>
                  <span className="font-medium">{formatVND(line.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DetailCard>
  )
}

function BookingPeople({ booking }: { booking: AdminBookingDetailResponse }) {
  const people = booking.flight
    ? booking.flight.passengers.map((person) => ({ ...person, category: passengerLabels[person.type] }))
    : booking.tour?.travelers.map((person) => ({ ...person, category: undefined }))
  if (!people?.length) return null
  return (
    <DetailCard title={booking.flight ? 'Hành khách' : 'Người đi tour'}>
      <ol className="divide-y text-sm">
        {people.map((person, index) => (
          <li key={index} className="flex flex-wrap justify-between gap-x-4 py-2">
            <span className="font-medium">{index + 1}. {person.fullName}</span>
            <span className="text-muted-foreground">
              {person.category}
              {person.category && person.dateOfBirth ? ' · ' : null}
              {person.dateOfBirth ? formatDate(person.dateOfBirth) : null}
            </span>
          </li>
        ))}
      </ol>
    </DetailCard>
  )
}

function BookingPayment({ booking }: { booking: AdminBookingDetailResponse }) {
  const events = [
    ['Tạo đơn', booking.createdAt],
    ['Đã nhận tiền', booking.paidAt],
    ['Xác nhận', booking.confirmedAt],
    ['Huỷ đơn', booking.cancelledAt],
  ] as const
  return (
    <div className="space-y-4">
      <DetailCard title="Thanh toán">
        <Values items={[
          ['Tổng tiền', <span className="tabular-nums">{formatVND(booking.totalAmount)}</span>],
          ['Trạng thái', <StatusBadge group="payment" value={booking.paymentStatus} />],
          // Tiền SePay báo về, cộng dồn qua các lần chuyển; thu bằng tay (đánh dấu đã nhận) không đổi số này.
          ['Đã nhận qua chuyển khoản', <span className="tabular-nums">{formatVND(booking.receivedAmount)}</span>],
          ...(booking.paymentStatus === 'UNPAID' && booking.receivedAmount > 0
            ? [['Còn thiếu', <span className="font-semibold text-warning tabular-nums">
              {formatVND(booking.totalAmount - booking.receivedAmount)}</span>] as const]
            : []),
          ['Nội dung chuyển khoản', <span className="font-mono">{booking.bankTransfer.content}</span>],
          ['Thời điểm thu', booking.paidAt ? formatDateTime(booking.paidAt) : '—'],
        ]} />
      </DetailCard>
      <BookingTransactions code={booking.code} />
      <DetailCard title="Dòng thời gian">
        <ol className="space-y-3 border-l pl-3 text-sm">
          {events.map(([label, date]) => date && (
            <li key={label} className="flex flex-col gap-1">
              <span className="font-medium">{label}</span>
              <time dateTime={date} className="text-muted-foreground tabular-nums">{formatDateTime(date)}</time>
            </li>
          ))}
        </ol>
      </DetailCard>
    </div>
  )
}

export function BookingDetailPage() {
  const { code = '' } = useParams()
  const validCode = isBookingCode(code)
  const query = useQuery(getGetAdminBookingQueryOptions(code, {
    query: { enabled: validCode, refetchOnWindowFocus: 'always' },
  }))

  if (!validCode || (query.error instanceof ApiError && query.error.status === 404)) {
    return <section className="space-y-3">
      <PageHeader title="Không tìm thấy đơn đặt chỗ" />
      <Button variant="outline" asChild><Link to="/bookings">Về danh sách đơn</Link></Button>
    </section>
  }
  if (query.isError) return <section className="space-y-3">
    <PageHeader title={query.error instanceof ApiError && query.error.status === 403 ? 'Bạn không có quyền' : 'Không tải được đơn đặt chỗ'} />
    <ErrorState onRetry={() => void query.refetch()} />
  </section>
  const booking = query.data
  if (!booking) return (
    <div aria-label="Đang tải đơn đặt chỗ" aria-busy="true" className="space-y-4">
      <Skeleton className="h-8 w-52" />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )

  const { contact, customer } = booking
  return (
    <section className="space-y-5">
      <PageHeader title={`Đơn ${booking.code}`} action={<BookingActions booking={booking} />} />
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton value={booking.code} label="Sao chép mã đơn" />
        <ServiceBadge kind={booking.kind} />
        <StatusBadge group="booking" value={booking.status} />
        <StatusBadge group="payment" value={booking.paymentStatus} />
        <time dateTime={booking.createdAt} className="text-sm text-muted-foreground tabular-nums">
          Tạo lúc {formatDateTime(booking.createdAt)}
        </time>
      </div>
      {booking.status === 'CANCELLED' && booking.paymentStatus === 'PAID' && (
        <p role="status" className="rounded-md bg-warning-surface px-4 py-3 text-sm text-warning">
          <strong>Cần hoàn tiền.</strong> Đơn đã huỷ và đã nhận tiền. Hãy hoàn tiền thủ công cho khách.
        </p>
      )}
      {booking.status === 'CANCELLED' && booking.paymentStatus === 'CANCELLED' && booking.receivedAmount > 0 && (
        <p role="status" className="rounded-md bg-warning-surface px-4 py-3 text-sm text-warning">
          <strong>Cần hoàn tiền.</strong> Đơn đã huỷ khi mới nhận {formatVND(booking.receivedAmount)}. Hãy hoàn lại
          cho khách rồi đánh dấu đã xử lý ở{' '}
          <Link className="font-medium underline underline-offset-4" to={paymentsOfBookingHref(booking.code)}>
            Giao dịch ngân hàng</Link>.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <ServiceDetails booking={booking} />
          <BookingPeople booking={booking} />
          <DetailCard title="Người liên hệ">
            <Values items={[
              ['Tài khoản khách', customer.hasCustomerProfile
                ? <Link className="text-primary hover:underline" to={`/customers/${customer.id}`}>{customer.fullName}</Link>
                : customer.fullName],
              ['Họ và tên', contact.fullName],
              ['Email', <span className="flex flex-wrap items-center gap-x-1">
                <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>
                <CopyButton value={contact.email} label="Sao chép email" />
              </span>],
              ['Điện thoại', <span className="flex flex-wrap items-center gap-x-1">
                <a className="text-primary underline-offset-4 hover:underline" href={`tel:${contact.phone.replace(/[^+0-9]/g, '')}`}>{contact.phone}</a>
                <CopyButton value={contact.phone} label="Sao chép số điện thoại" />
              </span>],
            ]} />
          </DetailCard>
          <DetailCard title="Ghi chú"><p className="whitespace-pre-wrap wrap-break-word text-sm">{booking.note || 'Không có ghi chú.'}</p></DetailCard>
        </div>
        <BookingPayment booking={booking} />
      </div>
    </section>
  )
}
