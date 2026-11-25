import { ArrowLeft, CircleAlert } from "lucide-react";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { FlightSearchForm } from "@/components/home/FlightSearchForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { loadAirports } from "@/lib/data/catalog-loaders";
import { getFlightRoutes } from "@/lib/data/flight-routes";
import { computeSegmentTotal, summarizePassengers } from "@/lib/data/flight-view";
import { getFlightOption, searchFlights } from "@/lib/data/flights";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { formatDate } from "@/lib/format";
import { buildFlightResultsHref, parseFlightBookingParams, type FlightSelection } from "@/lib/schemas/flight-booking";
import { buildFlightSearchParams, cabinLabel, hasFlightSearchParams, type FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightOptionView } from "@/lib/types";
import { FlightOptionCard } from "./FlightOptionCard";
import { FlightRouteCard } from "./FlightRouteCard";
import { SelectFlightButton } from "./SelectFlightButton";

/**
 * Hash của ô tìm kiếm trên trang `/flights` (đích cuộn + nơi thẻ chặng bay gửi gói điền sẵn). Cố ý KHÁC hash tab Vé máy
 * bay ở Trang chủ (`#tim-ve-may-bay`): Trang chủ rời đi vẫn nằm trong DOM (ẩn bằng `<Activity>`), trùng `id` thì cuộn nhầm.
 */
export const FLIGHT_SEARCH_HASH = "o-tim-ve-may-bay";

/** `id` của danh sách chuyến về — liên kết "Chọn chuyến đi" cuộn tới đây. */
const RETURN_LIST_ID = "chieu-ve";

/**
 * Phần phụ thuộc URL của trang `/flights` (trang bọc trong `<Suspense>`):
 *  - có lượt tìm hợp lệ → form điền sẵn + danh sách chuyến bay. Một chiều: "Chọn" sang trang đặt vé. Khứ hồi: chọn chuyến
 *    đi (ghi `out` lên URL), rồi chọn chuyến về → trang đặt vé;
 *  - không có → form trống + chặng bay phổ biến (bấm thẻ điền sẵn điểm đi/đến); tham số sai → thêm dòng báo.
 * Form đặt `key` theo lượt tìm (không tính `out`): chọn chuyến đi không làm form dựng lại.
 */
export async function FlightSearchSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Luật ngày (đã qua ngày, bay trong hôm nay...) cần "hôm nay" theo từng request. `searchParams` thôi chưa đủ để Next
  // ngừng prerender (partial prefetching), nên chặn rõ bằng `connection()` trước khi đọc giờ hiện tại.
  await connection();
  const raw = await searchParams;
  const { search, selection } = parseFlightBookingParams(raw);
  const airports = await loadAirports();

  return (
    <>
      {/* `scroll-mt-20` = header dính (h-16) + 1rem hở, để header không che mép trên của ô tìm kiếm. */}
      <span id={FLIGHT_SEARCH_HASH} className="block h-0 scroll-mt-20" />
      {airports.ok ? (
        <div className="mt-8 rounded-card bg-surface p-4 shadow-card sm:p-6">
          <FlightSearchForm
            key={search ? buildFlightSearchParams(search).toString() : "trong"}
            airports={airports.data}
            prefillHash={FLIGHT_SEARCH_HASH}
            initialValues={search ?? undefined}
          />
        </div>
      ) : (
        // Sân bay (từ gotrips-api) là dữ liệu của ô chọn: không có thì form không dùng được, hiện thông báo thay cho form;
        // phần kết quả/gợi ý bên dưới (chưa nối API) vẫn hiện.
        <SectionUnavailable what="ô tìm vé máy bay" className="mt-8 bg-surface shadow-card" />
      )}

      {search ? (
        <FlightResults search={search} selection={selection} />
      ) : (
        <FlightSuggestions invalidSearch={hasFlightSearchParams(raw)} />
      )}
    </>
  );
}

async function FlightResults({ search, selection }: { search: FlightSearchValues; selection: FlightSelection }) {
  const isRoundTrip = search.tripType === "roundTrip";
  const passengersLabel = summarizePassengers(search.adults, search.children, search.infants);
  // Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến (cùng luật với Server Action).
  const closedToday = search.departDate <= getTodayInVietnam();

  const [outbound, chosenOutbound] = await Promise.all([
    searchFlights({ from: search.from, to: search.to, date: search.departDate, cabin: search.cabin }),
    isRoundTrip && selection.out
      ? getFlightOption({
          scheduleId: selection.out,
          from: search.from,
          to: search.to,
          date: search.departDate,
          cabin: search.cabin,
        })
      : null,
  ]);
  const inbound =
    isRoundTrip && chosenOutbound
      ? await searchFlights({ from: search.to, to: search.from, date: search.returnDate, cabin: search.cabin })
      : [];

  const from = outbound[0]?.from;
  const to = outbound[0]?.to;
  const routeLabel = from && to ? `${from.city} – ${to.city}` : `${search.from} – ${search.to}`;
  const flightLabel = (f: FlightOptionView) => `${f.flightNumber} ${f.departTime}`;
  const total = (f: FlightOptionView) => computeSegmentTotal(f.fares, search);

  return (
    <div className="mt-10 space-y-10">
      {closedToday ? (
        <Alert className="border-accent-200 bg-accent-50 text-accent-800">
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-accent-800">
            Chuyến bay trong ngày hôm nay đã đóng đặt vé trực tuyến. Bạn vui lòng chọn ngày đi từ ngày mai.
          </AlertDescription>
        </Alert>
      ) : null}

      {chosenOutbound ? (
        <section aria-labelledby="chieu-di-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="chieu-di-heading" className="text-2xl font-bold tracking-tight text-ink">
              Chuyến đi đã chọn · {formatDate(search.departDate)}
            </h2>
            <Button asChild variant="ghost" size="sm">
              <AppLink href={buildFlightResultsHref(search)} scroll={false}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Đổi chuyến đi
              </AppLink>
            </Button>
          </div>
          <div className="mt-4">
            <FlightOptionCard
              flight={chosenOutbound}
              total={total(chosenOutbound)}
              passengersLabel={passengersLabel}
              selected
            />
          </div>
        </section>
      ) : (
        <section aria-labelledby="chieu-di-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="chieu-di-heading" className="text-2xl font-bold tracking-tight text-ink">
              {isRoundTrip ? "Chọn chuyến đi" : "Chuyến bay"}: {routeLabel} · {formatDate(search.departDate)}
            </h2>
            {/* role="status": đọc lại số kết quả cho người dùng trình đọc màn hình sau mỗi lượt tìm. */}
            <p role="status" className="text-sm text-ink-muted">
              {outbound.length > 0
                ? `${outbound.length} chuyến bay · ${cabinLabel(search.cabin)} · ${passengersLabel}`
                : "Không có chuyến bay"}
            </p>
          </div>
          <FlightList
            flights={outbound}
            emptyText="Chưa có chuyến bay thẳng nào cho chặng này. Bạn hãy thử điểm đi/điểm đến khác."
            render={(flight) => (
              <FlightOptionCard
                flight={flight}
                total={total(flight)}
                passengersLabel={passengersLabel}
                action={
                  isRoundTrip ? (
                    <Button asChild variant="accent" size="md" className="w-full md:w-auto">
                      <AppLink href={`${buildFlightResultsHref(search, { out: flight.scheduleId })}#${RETURN_LIST_ID}`}>
                        Chọn chuyến đi<span className="sr-only"> ({flightLabel(flight)})</span>
                      </AppLink>
                    </Button>
                  ) : (
                    <SelectFlightButton
                      search={search}
                      outboundId={flight.scheduleId}
                      label="Chọn"
                      flightLabel={flightLabel(flight)}
                      disabled={closedToday}
                    />
                  )
                }
              />
            )}
          />
        </section>
      )}

      {chosenOutbound ? (
        <section id={RETURN_LIST_ID} aria-labelledby="chieu-ve-heading" className="scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="chieu-ve-heading" className="text-2xl font-bold tracking-tight text-ink">
              Chọn chuyến về: {chosenOutbound.to.city} – {chosenOutbound.from.city} · {formatDate(search.returnDate)}
            </h2>
            <p role="status" className="text-sm text-ink-muted">
              {inbound.length > 0 ? `${inbound.length} chuyến bay` : "Không có chuyến bay"}
            </p>
          </div>
          <FlightList
            flights={inbound}
            emptyText="Chưa có chuyến bay về cho chặng này. Bạn hãy thử tìm vé một chiều."
            render={(flight) => (
              <FlightOptionCard
                flight={flight}
                total={total(flight)}
                passengersLabel={passengersLabel}
                action={
                  <SelectFlightButton
                    search={search}
                    outboundId={chosenOutbound.scheduleId}
                    returnId={flight.scheduleId}
                    label="Chọn chuyến về"
                    flightLabel={flightLabel(flight)}
                    disabled={closedToday}
                  />
                }
              />
            )}
          />
        </section>
      ) : null}
    </div>
  );
}

function FlightList({
  flights,
  emptyText,
  render,
}: {
  flights: FlightOptionView[];
  emptyText: string;
  render: (flight: FlightOptionView) => ReactNode;
}) {
  if (flights.length === 0) {
    return <p className="mt-4 rounded-card bg-surface p-8 text-center text-ink-muted shadow-card">{emptyText}</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {flights.map((flight) => (
        <li key={flight.scheduleId}>{render(flight)}</li>
      ))}
    </ul>
  );
}

async function FlightSuggestions({ invalidSearch }: { invalidSearch: boolean }) {
  const routes = await getFlightRoutes();

  return (
    <section aria-labelledby="ds-chang-bay-heading" className="mt-12">
      {invalidSearch ? (
        <Alert className="mb-8 border-accent-200 bg-accent-50 text-accent-800">
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-accent-800">
            Thông tin tìm kiếm chưa đầy đủ hoặc ngày bay đã qua. Bạn vui lòng chọn lại ở ô tìm kiếm phía trên.
          </AlertDescription>
        </Alert>
      ) : null}
      <h2 id="ds-chang-bay-heading" className="text-2xl font-bold tracking-tight text-ink">
        Chặng bay phổ biến
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">
        Bấm một thẻ để điền sẵn điểm đi và điểm đến vào ô tìm kiếm phía trên, rồi chọn ngày bay. Giá chỉ để tham khảo.
      </p>

      {routes.length > 0 ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <li key={route.id}>
              <FlightRouteCard route={route} searchHref={`/flights#${FLIGHT_SEARCH_HASH}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
          Hiện chưa có chặng bay nào để gợi ý. Vui lòng quay lại sau.
        </p>
      )}
    </section>
  );
}

/** Khung chờ khi đang đọc `searchParams`. */
export function FlightSearchSectionSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mt-8 h-64 w-full rounded-card sm:h-48" />
      <Skeleton className="mt-12 h-8 w-56" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-card" />
        ))}
      </div>
    </div>
  );
}
