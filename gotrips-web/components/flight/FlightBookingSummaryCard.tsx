import { Pencil, Plane, Users } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { buildFareLines, computeFlightTotal, SEGMENT_LABELS, summarizePassengers } from "@/lib/data/flight-view";
import { formatDate, formatVND } from "@/lib/format";
import { cabinLabel, type FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightOptionView } from "@/lib/types";

/**
 * Thẻ tóm tắt bên cạnh form đặt vé (dính khi cuộn ở màn hình rộng): các chặng bay, hành khách, hạng ghế và tiền TẠM
 * TÍNH (server tính lại lúc tạo đơn). "Thay đổi" về trang kết quả của lượt tìm để chọn lại chuyến.
 */
export function FlightBookingSummaryCard({
  search,
  segments,
  changeHref,
}: {
  search: FlightSearchValues;
  segments: FlightOptionView[];
  /** Không có khi đang gửi đơn (khoá nút). */
  changeHref?: string;
}) {
  const total = computeFlightTotal(segments, search);

  return (
    <aside aria-label="Tóm tắt đơn đặt vé" className="rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold leading-6 text-ink">
          {search.tripType === "roundTrip" ? "Vé khứ hồi" : "Vé một chiều"} · {cabinLabel(search.cabin)}
        </p>
        {changeHref ? (
          <Button asChild variant="ghost" size="sm" className="-mt-1.5 -mr-2 shrink-0">
            <AppLink href={changeHref}>
              <Pencil aria-hidden="true" className="size-4" />
              Thay đổi
              <span className="sr-only"> chuyến bay</span>
            </AppLink>
          </Button>
        ) : null}
      </div>

      <ol className="mt-3 space-y-3">
        {segments.map((segment, index) => (
          <li key={segment.scheduleId} className="rounded-control bg-surface-muted p-3 text-sm">
            <p className="flex items-center gap-1.5 font-semibold text-primary-800">
              <Plane aria-hidden="true" className="size-4" />
              {SEGMENT_LABELS[index]} · <time dateTime={segment.date}>{formatDate(segment.date)}</time>
            </p>
            <p className="mt-1 font-semibold text-ink">
              {segment.from.city} ({segment.from.code}) – {segment.to.city} ({segment.to.code})
            </p>
            <p className="text-ink-muted">
              {segment.airline.name} {segment.flightNumber} · {segment.departTime} – {segment.arriveTime}
              {segment.arrivesNextDay ? " (+1 ngày)" : ""}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-ink">
        <Users aria-hidden="true" className="size-4 text-ink-muted" />
        {summarizePassengers(search.adults, search.children, search.infants)}
      </p>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {buildFareLines(segments, search).map((line) => (
          <div key={line.label} className="flex justify-between gap-4">
            <dt className="text-ink-muted">{line.label}</dt>
            <dd className="shrink-0 font-medium text-ink">{formatVND(line.amount)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 pt-1">
          <dt className="font-semibold text-ink">Tạm tính</dt>
          <dd className="text-2xl font-extrabold text-accent-700">{formatVND(total)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-ink-muted">Giá đã gồm thuế phí.</p>
    </aside>
  );
}
