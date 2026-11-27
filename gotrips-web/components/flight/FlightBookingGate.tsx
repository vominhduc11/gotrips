import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { getCurrentUser } from "@/lib/auth/session";
import { getFlightOption } from "@/lib/data/flights";
import { loadSection } from "@/lib/data/load-section";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildFlightBookingHref,
  buildFlightResultsHref,
  isFlightSelectionComplete,
  parseFlightBookingParams,
  type FlightSelection,
} from "@/lib/schemas/flight-booking";
import type { FlightSearchValues } from "@/lib/schemas/flight-search";
import type { FlightOptionView } from "@/lib/types";
import { FlightBookingWizard } from "./FlightBookingWizard";

/** Các chặng đã chọn (đi, rồi về nếu khứ hồi); `null` nếu một chuyến không có hoặc không đúng chiều. */
async function loadSegments(search: FlightSearchValues, selection: FlightSelection): Promise<FlightOptionView[] | null> {
  const { cabin, adults, children, infants } = search;
  const passengers = { cabin, adults, children, infants };
  const [outbound, inbound] = await Promise.all([
    getFlightOption(selection.out ?? 0, { ...passengers, from: search.from, to: search.to, date: search.departDate }),
    search.tripType === "roundTrip"
      ? getFlightOption(selection.ret ?? 0, { ...passengers, from: search.to, to: search.from, date: search.returnDate })
      : undefined,
  ]);
  if (!outbound || inbound === null) return null;
  return inbound ? [outbound, inbound] : [outbound];
}

/**
 * Phần theo-yêu-cầu của trang đặt vé (đọc cookie phiên và search params) — trang bọc trong `<Suspense>`. Cùng khuôn với
 * `BookingGate` của tour:
 *  - lượt tìm trên URL sai → về `/flights`; chưa chọn đủ chuyến, chuyến không khớp chặng, không còn đặt được (không đủ
 *    ghế) hoặc bay trong hôm nay → về trang kết quả của lượt tìm đó để chọn lại;
 *  - API lỗi → thông báo tại chỗ (tải chuyến TRƯỚC khi kiểm phiên: khi API lỗi, kiểm phiên coi khách là chưa đăng nhập);
 *  - chưa đăng nhập → đăng nhập kèm `next` là đúng URL đang mở.
 * gotrips-api vẫn tự kiểm tra lại tất cả khi tạo đơn.
 */
export async function FlightBookingGate({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Luật ngày (đã qua ngày, bay trong hôm nay...) cần "hôm nay" theo từng request. `searchParams` thôi chưa đủ để Next
  // ngừng prerender (partial prefetching), nên chặn rõ bằng `connection()` trước khi đọc giờ hiện tại.
  await connection();
  const { search, selection, step } = parseFlightBookingParams(await searchParams);
  if (!search) redirect("/flights");
  if (!isFlightSelectionComplete(search, selection) || search.departDate <= getTodayInVietnam()) {
    redirect(buildFlightResultsHref(search));
  }

  const loaded = await loadSection("chuyến bay đã chọn", () => loadSegments(search, selection));
  if (!loaded.ok) return <SectionUnavailable what="thông tin chuyến bay" className="bg-surface shadow-card" />;
  const segments = loaded.data;
  if (!segments || segments.some((segment) => !segment.isBookable)) redirect(buildFlightResultsHref(search));

  const user = await getCurrentUser();
  if (!user) redirect(buildLoginHref(buildFlightBookingHref(search, selection, step)));

  return <FlightBookingWizard search={search} selection={selection} segments={segments} user={user} />;
}
