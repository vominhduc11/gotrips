import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyBookings } from "@/lib/data/bookings";
import { formatDateTime, formatVND } from "@/lib/format";
import { buildLoginHref } from "@/lib/safe-redirect";
import { BookingHighlights } from "./BookingHighlights";
import { BookingStatusBadges } from "./BookingStatusBadges";

/**
 * Danh sách "Đơn đặt chỗ của tôi": tour, khách sạn, vé máy bay chung một danh sách, mới nhất trước (đọc cookie nên trang
 * bọc trong Suspense). Chưa đăng nhập → đăng nhập rồi quay lại.
 */
export async function BookingHistory() {
  const user = await getCurrentUser();
  if (!user) redirect(buildLoginHref("/bookings"));

  const bookings = await getMyBookings();

  if (bookings.length === 0) {
    return (
      <div className="rounded-card bg-surface-muted px-6 py-12 text-center">
        <ClipboardList aria-hidden="true" className="mx-auto size-10 text-primary-700" />
        <p className="mt-3 text-lg font-semibold text-ink">Bạn chưa có đơn đặt chỗ nào</p>
        <p className="mt-1 text-ink-muted">Đặt tour, khách sạn hoặc vé máy bay chỉ trong vài bước.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <AppLink href="/tours">Khám phá tour</AppLink>
          </Button>
          <Button asChild variant="outline">
            <AppLink href="/hotels">Tìm khách sạn</AppLink>
          </Button>
          <Button asChild variant="outline">
            <AppLink href="/flights">Tìm vé máy bay</AppLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {bookings.map((booking) => (
        <li key={booking.code}>
          <article className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card sm:flex-row sm:p-5">
            <div className="relative aspect-16/9 shrink-0 overflow-hidden rounded-control sm:aspect-4/3 sm:w-44">
              <CoverImage src={booking.coverImage} alt={booking.coverImageAlt} sizes="(min-width: 640px) 176px, 100vw" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-primary-800">
                  <span className="sr-only">Mã đơn </span>
                  {booking.code}
                </p>
                <BookingStatusBadges status={booking.status} paymentStatus={booking.paymentStatus} />
              </div>
              <p className="mt-2 text-sm font-semibold text-primary-800">
                {booking.kindLabel} · {booking.subtitle}
              </p>
              <h2 className="text-lg font-bold leading-6 text-ink">
                <AppLink href={`/bookings/${booking.code}`} className="hover:text-primary-800 hover:underline">
                  {booking.title}
                </AppLink>
              </h2>
              <BookingHighlights highlights={booking.highlights} className="mt-2" />
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-extrabold text-accent-700">{formatVND(booking.totalAmount)}</p>
                  <p className="text-xs text-ink-muted">
                    Đặt lúc <time dateTime={booking.createdAt}>{formatDateTime(booking.createdAt)}</time>
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <AppLink href={`/bookings/${booking.code}`}>
                    Xem chi tiết<span className="sr-only"> đơn {booking.code}</span>
                  </AppLink>
                </Button>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
