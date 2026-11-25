import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeBookingSelection } from "@/lib/booking/steps";
import { buildLoginHref } from "@/lib/safe-redirect";
import { buildBookingHref, buildTourBookingHref, parseBookingParams } from "@/lib/schemas/booking";
import type { TourDetailView } from "@/lib/types";
import { BookingWizard } from "./BookingWizard";

/**
 * Phần theo-yêu-cầu của trang đặt tour (đọc cookie phiên và search params) — trang bọc trong `<Suspense>` để tiêu đề
 * và thông tin tour vẫn prerender.
 *
 * Trang đặt tour bắt đầu từ bước "Thông tin", nên trước khi hiện form phải có:
 *  - chuyến còn đặt được trên URL: thiếu hoặc chuyến đã hết chỗ (vd mở liên kết cũ) → về thẻ "Đặt tour" ở trang chi
 *    tiết để chọn lại, giữ số khách;
 *  - đăng nhập: chưa thì chuyển tới đăng nhập kèm `next` là đúng URL đang mở, đăng nhập xong quay lại đúng chỗ.
 * Đây chỉ là trải nghiệm: Server Action tạo đơn vẫn tự kiểm tra lại cả hai.
 */
export async function BookingGate({
  tour,
  searchParams,
}: {
  tour: TourDetailView;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseBookingParams(await searchParams);
  if (normalizeBookingSelection(params, tour.departures).departureId === 0) {
    redirect(buildTourBookingHref(tour.slug, { departure: undefined, guests: params.guests }));
  }

  const user = await getCurrentUser();
  if (!user) redirect(buildLoginHref(buildBookingHref(tour.slug, params)));

  return (
    <BookingWizard
      tour={{
        slug: tour.slug,
        title: tour.title,
        destinationName: tour.destinationName,
        coverImage: tour.coverImage,
        coverImageAlt: tour.coverImageAlt,
        durationDays: tour.durationDays,
        durationNights: tour.durationNights,
        departureCity: tour.departureCity,
      }}
      departures={tour.departures}
      user={user}
    />
  );
}
