import type { Destination, Hotel, HotelCardView, HotelRoomType } from "@/lib/types";

/**
 * Logic thuần của section "Khách sạn nổi bật" (không đụng cache/mock nên kiểm thử được bằng Vitest).
 * `lib/data/hotels.ts` chỉ lo lấy dữ liệu + cache rồi gọi vào đây.
 */

/** Giá một đêm thấp nhất trong các loại phòng; `null` nếu khách sạn chưa có loại phòng nào. */
export function getMinPricePerNight(roomTypes: Pick<HotelRoomType, "pricePerNight">[]): number | null {
  return roomTypes.reduce<number | null>(
    (min, room) => (min === null || room.pricePerNight < min ? room.pricePerNight : min),
    null,
  );
}

/**
 * Ghép khách sạn + điểm đến + loại phòng thành dữ liệu cho `HotelCard`.
 * Trả `null` khi khách sạn chưa có loại phòng nào: không có giá thì không có gì để hiện ở "Giá từ … / đêm".
 */
export function toHotelCardView(
  hotel: Hotel,
  destination: Destination,
  roomTypes: HotelRoomType[],
): HotelCardView | null {
  const minPricePerNight = getMinPricePerNight(roomTypes);
  if (minPricePerNight === null) return null;

  return {
    id: hotel.id,
    slug: hotel.slug,
    name: hotel.name,
    destinationName: destination.name,
    destinationSlug: destination.slug,
    area: hotel.area,
    starRating: hotel.starRating,
    imageUrl: hotel.imageUrl,
    imageAlt: hotel.imageAlt,
    rating: hotel.rating,
    reviewCount: hotel.reviewCount,
    minPricePerNight,
  };
}

/**
 * Khách sạn hiện ở Trang chủ, tối đa `limit`:
 *  - bỏ khách sạn `HIDDEN`;
 *  - bỏ khách sạn không có loại phòng (xem `toHotelCardView`) hoặc không tìm thấy điểm đến;
 *  - sắp theo điểm khách chấm giảm dần, rồi số đánh giá giảm dần, rồi `id` tăng dần (để thứ tự luôn cố định).
 */
export function selectFeaturedHotels(
  hotels: Hotel[],
  roomTypes: HotelRoomType[],
  destinations: Destination[],
  limit: number,
): HotelCardView[] {
  const views: HotelCardView[] = [];

  for (const hotel of hotels) {
    if (hotel.status !== "ACTIVE") continue;
    const destination = destinations.find((d) => d.id === hotel.destinationId);
    if (!destination) continue;

    const view = toHotelCardView(
      hotel,
      destination,
      roomTypes.filter((room) => room.hotelId === hotel.id),
    );
    if (view) views.push(view);
  }

  return views
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount || a.id - b.id)
    .slice(0, Math.max(0, limit));
}
