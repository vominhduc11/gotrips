import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { BOOKING_STATUS_BADGE, PAYMENT_STATUS_BADGE } from "@/lib/data/booking-view";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

/**
 * Hai nhãn TÁCH RIÊNG: trạng thái đơn và trạng thái thanh toán (MVP lưu hai trạng thái này ở hai bảng khác nhau).
 * Phần "Trạng thái đơn:"/"Thanh toán:" chỉ cho trình đọc màn hình, vì nhìn bằng mắt thì màu và chữ đã đủ phân biệt.
 */
export function BookingStatusBadges({
  status,
  paymentStatus,
  className,
}: {
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  className?: string;
}) {
  const booking = BOOKING_STATUS_BADGE[status];
  const payment = PAYMENT_STATUS_BADGE[paymentStatus];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Badge variant={booking.variant}>
        <span className="sr-only">Trạng thái đơn: </span>
        {booking.label}
      </Badge>
      <Badge variant={payment.variant}>
        <span className="sr-only">Thanh toán: </span>
        {payment.label}
      </Badge>
    </div>
  );
}
