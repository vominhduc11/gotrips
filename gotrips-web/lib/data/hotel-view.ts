import { diffInDays } from "@/lib/iso-date";
import type {
  Destination,
  Hotel,
  HotelCardView,
  HotelDetailView,
  HotelRoomType,
  HotelSearchResultView,
} from "@/lib/types";

/**
 * Logic thuần của khách sạn: thẻ ở Trang chủ, kết quả tìm kiếm, trang chi tiết và tiền phòng (không đụng cache/mock
 * nên kiểm thử được bằng Vitest). `lib/data/hotels.ts` chỉ lo lấy dữ liệu + cache rồi gọi vào đây.
 */

/** Số đêm lưu trú = số ngày lịch giữa ngày nhận và ngày trả (`YYYY-MM-DD`, đã hợp lệ). */
export function countNights(checkIn: string, checkOut: string): number {
  return diffInDays(checkOut, checkIn);
}

/**
 * Tiền phòng = giá một phòng một đêm × số đêm × số phòng. Một chỗ tính duy nhất cho thẻ "Đặt phòng", trang đặt phòng
 * và Server Action (server tính lại, không tin số ở trình duyệt).
 */
export function computeStayTotal(pricePerNight: number, nights: number, rooms: number): number {
  return pricePerNight * nights * rooms;
}

/** Loại phòng chứa đủ số khách khi đặt `rooms` phòng: mỗi phòng ít nhất 1 khách, nhiều nhất `maxGuests`. */
export function roomFitsGuests(room: Pick<HotelRoomType, "maxGuests">, guests: number, rooms: number): boolean {
  return rooms >= 1 && rooms <= guests && guests <= room.maxGuests * rooms;
}

/** Loại phòng sắp theo giá tăng dần, rồi `id` (thứ tự luôn cố định). Không sửa mảng đầu vào. */
export function sortRoomTypes(roomTypes: HotelRoomType[]): HotelRoomType[] {
  return [...roomTypes].sort((a, b) => a.pricePerNight - b.pricePerNight || a.id - b.id);
}

/** Phòng rẻ nhất chứa đủ khách; không phòng nào chứa đủ → `undefined`. */
export function findCheapestFittingRoom(
  roomTypes: HotelRoomType[],
  guests: number,
  rooms: number,
): HotelRoomType | undefined {
  return sortRoomTypes(roomTypes).find((room) => roomFitsGuests(room, guests, rooms));
}

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

/** Khách sạn khách được phép thấy (ACTIVE, có điểm đến) kèm loại phòng của nó. */
function visibleHotels(hotels: Hotel[], roomTypes: HotelRoomType[], destinations: Destination[]) {
  return hotels.flatMap((hotel) => {
    if (hotel.status !== "ACTIVE") return [];
    const destination = destinations.find((d) => d.id === hotel.destinationId);
    if (!destination) return [];
    return [{ hotel, destination, rooms: roomTypes.filter((room) => room.hotelId === hotel.id) }];
  });
}

/**
 * Trang chi tiết khách sạn theo slug. `null` nếu không có, đang ẩn (HIDDEN) hoặc chưa có loại phòng nào — trang sẽ
 * `notFound()`, giống tour bị ẩn.
 */
export function findHotelDetail(
  hotels: Hotel[],
  roomTypes: HotelRoomType[],
  destinations: Destination[],
  slug: string,
): HotelDetailView | null {
  const found = visibleHotels(hotels, roomTypes, destinations).find(({ hotel }) => hotel.slug === slug);
  if (!found) return null;
  const card = toHotelCardView(found.hotel, found.destination, found.rooms);
  if (!card) return null;

  return {
    ...card,
    description: found.hotel.description,
    amenities: found.hotel.amenities,
    checkInTime: found.hotel.checkInTime,
    checkOutTime: found.hotel.checkOutTime,
    roomTypes: sortRoomTypes(found.rooms),
  };
}

/** Slug các khách sạn có trang chi tiết (cho `generateStaticParams`). */
export function listHotelSlugs(hotels: Hotel[], roomTypes: HotelRoomType[], destinations: Destination[]): string[] {
  return visibleHotels(hotels, roomTypes, destinations)
    .filter(({ rooms }) => rooms.length > 0)
    .map(({ hotel }) => hotel.slug);
}

export interface HotelSearchQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

/**
 * Kết quả tìm khách sạn (tham số đã qua schema): khách sạn hiển thị được ở điểm đến đó, có loại phòng chứa đủ khách
 * với số phòng đã chọn. Mỗi khách sạn chỉ hiện phòng RẺ NHẤT phù hợp và tổng tiền cả kỳ lưu trú; sắp theo tổng tiền
 * tăng dần, rồi điểm đánh giá giảm dần, rồi `id`. Điểm đến không có → `destination: null`, không có kết quả.
 */
export function searchHotels(
  hotels: Hotel[],
  roomTypes: HotelRoomType[],
  destinations: Destination[],
  query: HotelSearchQuery,
): { destination: Destination | null; items: HotelSearchResultView[] } {
  const destination = destinations.find((d) => d.slug === query.destination) ?? null;
  if (!destination) return { destination: null, items: [] };

  const nights = countNights(query.checkIn, query.checkOut);
  const items = visibleHotels(hotels, roomTypes, destinations).flatMap(({ hotel, destination: d, rooms }) => {
    if (d.id !== destination.id) return [];
    const room = findCheapestFittingRoom(rooms, query.guests, query.rooms);
    const card = toHotelCardView(hotel, d, rooms);
    if (!room || !card) return [];
    return [{ ...card, room, nights, rooms: query.rooms, totalPrice: computeStayTotal(room.pricePerNight, nights, query.rooms) }];
  });

  items.sort((a, b) => a.totalPrice - b.totalPrice || b.rating - a.rating || a.id - b.id);
  return { destination, items };
}
