import { ArrowRight, Plane } from "lucide-react";
import type { ReactNode } from "react";
import { cabinLabel } from "@/lib/schemas/flight-search";
import { formatFlightDuration, formatVND } from "@/lib/format";
import type { FlightOptionView } from "@/lib/types";

/**
 * Một chuyến bay: hãng + số hiệu, giờ cất/hạ cánh (kèm "+1 ngày" nếu hạ cánh sau nửa đêm), thời gian bay, giá một người
 * lớn và tổng cho cả đoàn của chặng. `action` là nút/liên kết chọn chuyến (trang kết quả) — trang đặt vé không truyền.
 */
export function FlightOptionCard({
  flight,
  total,
  passengersLabel,
  action,
  selected = false,
}: {
  flight: FlightOptionView;
  /** Tiền chặng này cho cả đoàn. */
  total: number;
  /** Ví dụ "2 người lớn, 1 em bé". */
  passengersLabel: string;
  action?: ReactNode;
  selected?: boolean;
}) {
  return (
    <article
      className={
        selected
          ? "rounded-card border-2 border-primary-700 bg-surface p-4 shadow-card sm:p-5"
          : "rounded-card border border-line bg-surface p-4 shadow-card sm:p-5"
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary-800">
            <Plane aria-hidden="true" className="size-4 shrink-0" />
            {flight.airline.name} · {flight.flightNumber}
            <span className="font-normal text-ink-muted">· {cabinLabel(flight.cabin)}</span>
          </p>
          <div className="mt-2 flex items-center gap-3 sm:gap-5">
            <div>
              <p className="text-2xl font-bold text-ink">{flight.departTime}</p>
              <p className="text-sm text-ink-muted">{flight.from.code}</p>
            </div>
            <div className="flex min-w-16 flex-1 flex-col items-center text-xs text-ink-muted sm:max-w-48">
              <span>{formatFlightDuration(flight.durationMinutes)}</span>
              <span aria-hidden="true" className="my-1 flex w-full items-center gap-1">
                <span className="h-px flex-1 bg-line" />
                <ArrowRight className="size-4" />
              </span>
              <span>Bay thẳng</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">
                {flight.arriveTime}
                {flight.arrivesNextDay ? (
                  <sup className="ml-0.5 text-xs font-semibold text-accent-700">
                    +1<span className="sr-only"> ngày</span>
                  </sup>
                ) : null}
              </p>
              <p className="text-sm text-ink-muted">{flight.to.code}</p>
            </div>
          </div>
          <p className="sr-only">
            Cất cánh {flight.departTime} từ {flight.from.city}, hạ cánh {flight.arriveTime}
            {flight.arrivesNextDay ? " ngày hôm sau" : ""} tại {flight.to.city}.
          </p>
        </div>

        <div className="shrink-0 border-t border-line pt-3 md:border-0 md:pt-0 md:text-right">
          <p className="text-xs text-ink-muted">Giá mỗi người lớn</p>
          <p className="text-xl font-extrabold leading-7 text-accent-700">{formatVND(flight.fares.adult)}</p>
          <p className="text-xs text-ink-muted">
            {formatVND(total)} cho {passengersLabel}
          </p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}
