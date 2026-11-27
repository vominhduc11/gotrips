import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { normalizeHotelStay } from "@/lib/booking/hotel-stay";
import { toRoomTypeView } from "@/lib/data/hotel-view";
import { buildLoginHref } from "@/lib/safe-redirect";
import { buildHotelBookingHref, buildHotelDetailHref, parseHotelStayParams } from "@/lib/schemas/hotel-booking";
import type { HotelDetailView } from "@/lib/types";
import { HotelBookingWizard } from "./HotelBookingWizard";

/**
 * Phần theo-yêu-cầu của trang đặt phòng (đọc cookie phiên và search params) — trang bọc trong `<Suspense>` để tiêu đề
 * và thông tin khách sạn vẫn prerender. Cùng khuôn với `BookingGate` của tour:
 *  - lựa chọn trên URL không đặt được (thiếu ngày, ngày đã qua, phòng không chứa đủ khách...) → về thẻ "Đặt phòng" ở
 *    trang chi tiết, giữ những gì URL đang có để khách sửa;
 *  - chưa đăng nhập → đăng nhập kèm `next` là đúng URL đang mở.
 * Đây chỉ là trải nghiệm: Server Action tạo đơn vẫn tự kiểm tra lại cả hai.
 */
export async function HotelBookingGate({
  hotel,
  searchParams,
}: {
  hotel: HotelDetailView;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Luật ngày (đã qua ngày, bay trong hôm nay...) cần "hôm nay" theo từng request. `searchParams` thôi chưa đủ để Next
  // ngừng prerender (partial prefetching), nên chặn rõ bằng `connection()` trước khi đọc giờ hiện tại.
  await connection();
  const { step, ...selection } = parseHotelStayParams(await searchParams);
  const stay = normalizeHotelStay(selection, hotel.roomTypes);
  if (!stay) redirect(buildHotelDetailHref(hotel.slug, selection));

  const user = await getCurrentUser();
  if (!user) redirect(buildLoginHref(buildHotelBookingHref(hotel.slug, selection, step)));

  // Schema đã kiểm phòng thuộc khách sạn này nên luôn tìm thấy.
  const room = hotel.roomTypes.find((r) => r.id === stay.roomTypeId)!;

  return (
    <HotelBookingWizard
      hotel={{
        slug: hotel.slug,
        name: hotel.name,
        area: hotel.area,
        imageUrl: hotel.imageUrl,
        imageAlt: hotel.imageAlt,
        checkInTime: hotel.checkInTime,
        checkOutTime: hotel.checkOutTime,
      }}
      room={toRoomTypeView(room)}
      stay={stay}
      user={user}
    />
  );
}
