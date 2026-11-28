import { ArrowLeft, CircleAlert, Plane } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { isBookingCode } from "@/lib/booking/booking-code-format";
import { getMyBooking } from "@/lib/data/bookings";
import { loadSection } from "@/lib/data/load-section";
import { formatDate, formatDateTime, formatFlightDuration, formatVND } from "@/lib/format";
import { cabinLabel } from "@/lib/schemas/flight-search";
import { buildLoginHref } from "@/lib/safe-redirect";
import type { BookingKind } from "@/lib/types";
import { BankTransferInfo } from "./BankTransferInfo";
import { BookingHighlights } from "./BookingHighlights";
import { BookingStatusBadges } from "./BookingStatusBadges";
import { PaymentStatusWatcher } from "./PaymentStatusWatcher";

const sectionClass = "rounded-card bg-surface p-5 shadow-card";

const SECTION_TITLE: Record<BookingKind, string> = { TOUR: "Chuyến đi", HOTEL: "Kỳ lưu trú", FLIGHT: "Chuyến bay" };

/**
 * Chi tiết một đơn — tour, khách sạn hay vé máy bay đều chung khung này; phần khác nhau theo loại đã được quy về
 * `highlights`, `priceLines`, `people` (và `flightSegments` với vé máy bay) ở `lib/data/booking-view.ts`.
 * Đọc cookie → trang bọc trong Suspense. Mã sai định dạng, không có, hoặc là đơn của người khác
 * đều trả 404 như nhau — không cho đoán mã để biết đơn có tồn tại hay không. API lỗi → thông báo tại chỗ.
 */
export async function BookingDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isBookingCode(code)) notFound();

  const result = await loadSection("chi tiết đơn", () => getMyBooking(code));
  if (!result.ok) return <SectionUnavailable what="thông tin đơn đặt chỗ" className="bg-surface shadow-card" />;
  if (result.data.status === "unauthenticated") redirect(buildLoginHref(`/bookings/${code}`));
  const booking = result.data.data;
  if (!booking) notFound();

  const awaitingPayment = booking.status !== "CANCELLED" && booking.paymentStatus === "UNPAID";

  return (
    <>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <AppLink href="/">Trang chủ</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <AppLink href="/bookings">Đơn đặt chỗ của tôi</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{booking.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-muted">Đơn đặt {booking.kindLabel.toLowerCase()}</p>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-ink sm:text-4xl">{booking.code}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Đặt lúc <time dateTime={booking.createdAt}>{formatDateTime(booking.createdAt)}</time>
          </p>
        </div>
        <BookingStatusBadges status={booking.status} paymentStatus={booking.paymentStatus} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="chuyen-di-heading" className={sectionClass}>
            <h2 id="chuyen-di-heading" className="text-xl font-bold text-ink">
              {SECTION_TITLE[booking.kind]}
            </h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="relative aspect-16/9 shrink-0 overflow-hidden rounded-control sm:aspect-4/3 sm:w-48">
                <CoverImage src={booking.coverImage} alt={booking.coverImageAlt} sizes="(min-width: 640px) 192px, 100vw" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-800">{booking.subtitle}</p>
                <p className="mt-1 text-lg font-bold leading-6 text-ink">
                  {booking.productHref ? (
                    <AppLink href={booking.productHref} className="hover:text-primary-800 hover:underline">
                      {booking.title}
                    </AppLink>
                  ) : (
                    booking.title
                  )}
                </p>
                <BookingHighlights
                  highlights={booking.highlights}
                  className="mt-3 grid gap-2 text-ink sm:grid-cols-2"
                  iconClassName="size-4 shrink-0 text-primary-700"
                />
              </div>
            </div>

            {booking.flightSegments.length > 0 ? (
              <ol className="mt-5 space-y-3">
                {booking.flightSegments.map((segment) => (
                  <li key={`${segment.label}-${segment.scheduleId}`} className="rounded-control bg-surface-muted p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-semibold text-primary-800">
                      <Plane aria-hidden="true" className="size-4" />
                      {segment.label} · <time dateTime={segment.date}>{formatDate(segment.date)}</time> ·{" "}
                      {cabinLabel(segment.cabin)}
                    </p>
                    <p className="mt-1 font-semibold text-ink">
                      {segment.from.city} ({segment.from.code}) {segment.departTime} – {segment.to.city} (
                      {segment.to.code}) {segment.arriveTime}
                      {segment.arrivesNextDay ? " (+1 ngày)" : ""}
                    </p>
                    <p className="text-ink-muted">
                      {segment.airline.name} {segment.flightNumber} · bay thẳng {formatFlightDuration(segment.durationMinutes)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <section aria-labelledby="nguoi-di-heading" className={sectionClass}>
            <h2 id="nguoi-di-heading" className="text-xl font-bold text-ink">
              {booking.peopleHeading}
            </h2>
            <ol className="mt-3 divide-y divide-line">
              {booking.people.map((person, index) => (
                <li key={index} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium text-ink">
                    {booking.people.length > 1 ? `${index + 1}. ` : ""}
                    {person.name}
                  </span>
                  <span className="text-ink-muted">{person.detail}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="lien-he-heading" className={sectionClass}>
            <h2 id="lien-he-heading" className="text-xl font-bold text-ink">
              Người liên hệ
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-muted">Họ và tên</dt>
                <dd className="font-medium text-ink">{booking.contact.fullName}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Số điện thoại</dt>
                <dd className="font-medium text-ink">{booking.contact.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-ink-muted">Email</dt>
                <dd className="font-medium break-all text-ink">{booking.contact.email}</dd>
              </div>
              {booking.note ? (
                <div className="sm:col-span-2">
                  <dt className="text-ink-muted">Ghi chú</dt>
                  <dd className="whitespace-pre-line text-ink">{booking.note}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        {/* Màn hẹp: thanh toán lên đầu — sau khi đặt, việc khách cần làm tiếp là chuyển khoản. */}
        <div className="order-first space-y-6 lg:sticky lg:top-24 lg:order-none">
          <section aria-labelledby="thanh-toan-heading" className={sectionClass}>
            <h2 id="thanh-toan-heading" className="text-xl font-bold text-ink">
              Thanh toán
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              {booking.priceLines.map((line) => (
                <div key={line.label} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{line.label}</dt>
                  <dd className="shrink-0 font-medium text-ink">{formatVND(line.amount)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
                <dt className="font-semibold text-ink">Tổng tiền</dt>
                <dd className="text-2xl font-extrabold text-accent-700">{formatVND(booking.totalAmount)}</dd>
              </div>
            </dl>

            <div className="mt-4 space-y-3 text-sm">
              {awaitingPayment ? (
                <>
                  <BankTransferInfo bank={booking.bankTransfer} receivedAmount={booking.receivedAmount} />
                  <PaymentStatusWatcher
                    code={booking.code}
                    initial={{
                      status: booking.status,
                      paymentStatus: booking.paymentStatus,
                      receivedAmount: booking.receivedAmount,
                    }}
                  />
                </>
              ) : null}
              {booking.paidAt ? (
                <p className="text-success-700">
                  Đã nhận thanh toán lúc <time dateTime={booking.paidAt}>{formatDateTime(booking.paidAt)}</time>.
                </p>
              ) : null}
              {booking.confirmedAt ? (
                <p className="text-ink">
                  Đơn đã được xác nhận lúc{" "}
                  <time dateTime={booking.confirmedAt}>{formatDateTime(booking.confirmedAt)}</time>. Chúc bạn có
                  chuyến đi vui vẻ!
                </p>
              ) : null}
              {booking.cancelledAt ? (
                <p className="text-ink-muted">
                  Đơn đã huỷ lúc <time dateTime={booking.cancelledAt}>{formatDateTime(booking.cancelledAt)}</time>.
                </p>
              ) : null}
              {booking.needsRefund ? (
                <Alert className="border-accent-200 bg-accent-50 text-accent-800">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription className="text-accent-800">
                    Đơn đã huỷ sau khi bạn thanh toán. GoTrips sẽ hoàn tiền thủ công cho bạn.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <p className="mt-10">
        <AppLink
          href="/bookings"
          className="inline-flex items-center gap-2 font-semibold text-primary-800 underline underline-offset-4"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Tất cả đơn đặt chỗ
        </AppLink>
      </p>
    </>
  );
}
