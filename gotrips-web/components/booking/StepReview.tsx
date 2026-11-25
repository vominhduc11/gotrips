"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { computeBookingTotal } from "@/lib/data/booking-view";
import { formatDate, formatVND } from "@/lib/format";
import type { BookingFormValues } from "@/lib/schemas/booking";
import type { TourDepartureView } from "@/lib/types";
import type { BookingTour } from "./BookingSummaryCard";
import { ContactReview, ReviewSection, reviewRowClass as rowClass } from "./ReviewSection";

/**
 * Bước "Xác nhận": xem lại toàn bộ trước khi gửi. "Sửa lịch" mở hộp thoại đổi ngày / số khách ngay tại trang (không mất
 * thông tin đã nhập); "Sửa thông tin"/"Sửa người đi" quay về bước "Thông tin".
 */
export function StepReview({
  tour,
  departure,
  onEditTrip,
  onEditDetails,
}: {
  tour: BookingTour;
  departure: TourDepartureView;
  onEditTrip: () => void;
  onEditDetails: () => void;
}) {
  const { control } = useFormContext<BookingFormValues>();
  const [guests, contact, travelers, note] = useWatch({ control, name: ["guests", "contact", "travelers", "note"] });

  return (
    <div className="space-y-4">
      <ReviewSection title="Chuyến đi" editLabel="Sửa lịch" onEdit={onEditTrip}>
        <dl className="space-y-2 text-sm">
          <div className={rowClass}>
            <dt className="text-ink-muted">Tour</dt>
            <dd className="font-medium text-ink">{tour.title}</dd>
          </div>
          <div className={rowClass}>
            <dt className="text-ink-muted">Ngày khởi hành</dt>
            <dd className="font-medium text-ink">
              <time dateTime={departure.departureDate}>{formatDate(departure.departureDate)}</time>
            </dd>
          </div>
          <div className={rowClass}>
            <dt className="text-ink-muted">Số khách</dt>
            <dd className="font-medium text-ink">{guests}</dd>
          </div>
          <div className={rowClass}>
            <dt className="text-ink-muted">Tổng tiền (tạm tính)</dt>
            <dd className="font-bold text-accent-700">{formatVND(computeBookingTotal(departure.price, guests))}</dd>
          </div>
        </dl>
      </ReviewSection>

      <ContactReview contact={contact} note={note} onEdit={onEditDetails} />

      <ReviewSection title={`Người đi (${travelers.length})`} editLabel="Sửa người đi" onEdit={onEditDetails}>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
          {travelers.map((traveler, index) => (
            <li key={index}>
              <span className="font-medium">{traveler.fullName}</span>
              {traveler.dateOfBirth ? (
                <span className="text-ink-muted"> · sinh ngày {formatDate(traveler.dateOfBirth)}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </ReviewSection>
    </div>
  );
}
