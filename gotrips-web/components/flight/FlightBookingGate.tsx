import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getFlightOption } from "@/lib/data/flights";
import { getTodayInVietnam } from "@/lib/data/tour-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import {
  buildFlightBookingHref,
  buildFlightResultsHref,
  isFlightSelectionComplete,
  parseFlightBookingParams,
} from "@/lib/schemas/flight-booking";
import type { FlightOptionView } from "@/lib/types";
import { FlightBookingWizard } from "./FlightBookingWizard";

/**
 * Phần theo-yêu-cầu của trang đặt vé (đọc cookie phiên và search params) — trang bọc trong `<Suspense>`. Cùng khuôn với
 * `BookingGate` của tour:
 *  - lượt tìm trên URL sai → về `/flights`; chưa chọn đủ chuyến, chuyến không khớp chặng, hoặc bay trong hôm nay → về
 *    trang kết quả của lượt tìm đó để chọn lại;
 *  - chưa đăng nhập → đăng nhập kèm `next` là đúng URL đang mở.
 * Server Action tạo đơn vẫn tự kiểm tra lại tất cả.
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

  const outbound = await getFlightOption({
    scheduleId: selection.out ?? 0,
    from: search.from,
    to: search.to,
    date: search.departDate,
    cabin: search.cabin,
  });
  const inbound =
    search.tripType === "roundTrip"
      ? await getFlightOption({
          scheduleId: selection.ret ?? 0,
          from: search.to,
          to: search.from,
          date: search.returnDate,
          cabin: search.cabin,
        })
      : null;
  if (!outbound || (search.tripType === "roundTrip" && !inbound)) redirect(buildFlightResultsHref(search));
  const segments: FlightOptionView[] = inbound ? [outbound, inbound] : [outbound];

  const user = await getCurrentUser();
  if (!user) redirect(buildLoginHref(buildFlightBookingHref(search, selection, step)));

  return <FlightBookingWizard search={search} selection={selection} segments={segments} user={user} />;
}
