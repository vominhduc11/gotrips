import type {
  AirportResponse,
  DestinationResponse,
  FlightRouteCardResponse,
  HotelCardResponse,
  HotelDetailResponse,
  HotelSearchResponse,
  TestimonialResponse,
  TourCardResponse,
} from "../lib/api/generated/model";
import { formatDate } from "../lib/format";
import { addDays, apiGet, expect, money, randomFutureDate, test } from "./fixtures";

/**
 * Dữ liệu danh mục lấy từ gotrips-api: Trang chủ, /destinations, /hotels phải hiện đúng số thẻ, thứ tự và giá mà API
 * trả. Giá trị kỳ vọng đọc từ chính API (cần gotrips-api + DB có dữ liệu seed đang chạy, xem CLAUDE.md). Các section
 * stream sau static shell nên mỗi khẳng định dùng `toHaveCount`/`toBeVisible` (tự chờ) thay vì đếm ngay.
 *
 * Trong dữ liệu seed có một tour (Fansipan) và một khách sạn (Resort Biển Xanh) đang ẩn: không được hiện ở đâu.
 */

const grid = (section: string) => `${section} > div > ul > li`;
const SLIDE = '[data-slot="carousel-item"]';
const HOTEL_SECTION = 'section[aria-labelledby="khach-san-noi-bat-heading"]';
const FLIGHT_SECTION = 'section[aria-labelledby="chang-bay-pho-bien-heading"]';
const TESTIMONIAL_SECTION = 'section[aria-labelledby="khach-hang-heading"]';

test("Trang chủ hiện đủ dữ liệu từ API: điểm đến, tour, khách sạn, chặng bay, đánh giá", async ({ page, request }) => {
  const [destinations, tours, hotels, routes, testimonials] = await Promise.all([
    apiGet<DestinationResponse[]>(request, "/destinations"),
    apiGet<TourCardResponse[]>(request, "/tours/featured"),
    apiGet<HotelCardResponse[]>(request, "/hotels/featured"),
    apiGet<FlightRouteCardResponse[]>(request, "/flight-routes/popular"),
    apiGet<TestimonialResponse[]>(request, "/testimonials"),
  ]);
  await page.goto("/");

  await expect(page.locator(grid("#diem-den"))).toHaveCount(destinations.length);
  await expect(page.locator(grid("#tour-noi-bat"))).toHaveCount(tours.length);
  await expect(page.locator(grid(HOTEL_SECTION))).toHaveCount(hotels.length);
  await expect(page.locator(grid(FLIGHT_SECTION))).toHaveCount(routes.length);
  await expect(page.locator(grid(TESTIMONIAL_SECTION))).toHaveCount(testimonials.length);

  // Không có khung chờ nào kẹt lại, không có thông báo lỗi.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByText(/Chưa tải được/)).toHaveCount(0);
});

test("Trang chủ: tour nổi bật đúng thứ tự, ngày gần nhất, giá từ, giảm giá và nhãn sắp hết chỗ do API tính", async ({
  page,
  request,
}) => {
  // Test đặt chỗ chạy song song có thể đổi số chỗ giữa lúc đọc API và lúc mở trang nên thử lại cả cặp.
  await expect(async () => {
    const tours = await apiGet<TourCardResponse[]>(request, "/tours/featured");
    await page.goto("/");
    const cards = page.locator(grid("#tour-noi-bat"));
    await expect(cards).toHaveCount(tours.length, { timeout: 5000 });
    for (const [index, tour] of tours.entries()) {
      const card = cards.nth(index);
      await expect(card).toContainText(tour.title, { timeout: 1000 });
      if (tour.nextDepartureDate) {
        await expect(card).toContainText(formatDate(tour.nextDepartureDate), { timeout: 1000 });
      }
      if (tour.priceFrom !== null) await expect(card).toContainText(money(tour.priceFrom), { timeout: 1000 });
      if (tour.originalPriceFrom !== null) {
        await expect(card).toContainText(money(tour.originalPriceFrom), { timeout: 1000 });
      }
      if (tour.isAlmostFull) await expect(card).toContainText("Sắp hết chỗ", { timeout: 1000 });
    }
  }).toPass();
  await expect(page.getByText("Chinh phục Fansipan")).toHaveCount(0);
});

test("Trang chủ: khách sạn nổi bật đúng thứ tự và giá một đêm, không có khách sạn đang ẩn", async ({ page, request }) => {
  const hotels = await apiGet<HotelCardResponse[]>(request, "/hotels/featured");
  await page.goto("/");
  const cards = page.locator(grid(HOTEL_SECTION));
  await expect(cards).toHaveCount(hotels.length);
  for (const [index, hotel] of hotels.entries()) {
    await expect(cards.nth(index)).toContainText(hotel.name);
    await expect(cards.nth(index)).toContainText(money(hotel.minPricePerNight));
  }
  await expect(page.getByText("Resort Biển Xanh")).toHaveCount(0);
});

test("/hotels: gợi ý và kết quả tìm theo API", async ({ page, request }) => {
  const suggestions = await apiGet<HotelCardResponse[]>(request, "/hotels/featured", { limit: 50 });
  await page.goto("/hotels");
  await expect(page.getByRole("heading", { level: 2, name: "Khách sạn gợi ý" })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="ds-khach-san-heading"] ul > li')).toHaveCount(suggestions.length);
  await expect(page.getByText("Resort Biển Xanh")).toHaveCount(0);

  const checkIn = randomFutureDate();
  const checkOut = addDays(checkIn, 3);
  const search = await apiGet<HotelSearchResponse>(request, "/hotels", {
    destination: "da-lat",
    checkIn,
    checkOut,
    guests: 3,
    rooms: 1,
  });
  await page.goto(`/hotels?destination=da-lat&checkIn=${checkIn}&checkOut=${checkOut}&guests=3&rooms=1`);
  const cards = page.getByRole("region", { name: `Khách sạn ở ${search.destinationName}` }).getByRole("article");
  await expect(cards).toHaveCount(search.items.length);
  for (const [index, item] of search.items.entries()) {
    await expect(cards.nth(index)).toContainText(item.name);
    await expect(cards.nth(index)).toContainText(item.room.name);
    await expect(cards.nth(index)).toContainText(money(item.totalPrice));
  }
  await expect(page.getByText(/Chưa tải được/)).toHaveCount(0);
});

test("/hotels/[slug]: chi tiết theo API (giờ nhận/trả, bộ ảnh, tiện ích, loại phòng); khách sạn ẩn và slug lạ là 404", async ({
  page,
  request,
}) => {
  for (const slug of ["khach-san-doi-may-da-lat", "villa-thong-xanh-da-lat"]) {
    const hotel = await apiGet<HotelDetailResponse>(request, `/hotels/${slug}`);
    await page.goto(`/hotels/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: hotel.name })).toBeVisible();
    await expect(
      page.getByText(`Nhận phòng từ ${hotel.checkInTime}, trả phòng trước ${hotel.checkOutTime}`).first(),
    ).toBeVisible();

    // Bộ ảnh đầu trang = ảnh đại diện + ảnh xem thêm.
    await expect(
      page.getByRole("region", { name: `Ảnh ${hotel.name}`, exact: true }).locator(SLIDE),
    ).toHaveCount(1 + hotel.images.length);
    await expect(page.getByRole("list", { name: "Tiện ích nổi bật" }).getByRole("listitem")).toHaveText(
      hotel.amenities.map((amenity) => amenity.name),
    );

    for (const room of hotel.roomTypes) {
      const heading = page.getByRole("heading", { level: 3, name: room.name, exact: true });
      await expect(heading).toBeVisible();
      const card = page.locator('section[aria-labelledby="loai-phong-heading"] > ul > li').filter({ has: heading });
      await expect(card.getByRole("list", { name: `Tiện ích ${room.name}` }).getByRole("listitem")).toHaveText(
        room.amenities.map((amenity) => amenity.name),
      );
      // Đúng số ảnh, đúng ảnh của chính phòng đó. Một ảnh thì không dựng carousel.
      await expect(card.locator("img")).toHaveCount(room.images.length);
      for (const image of room.images) {
        await expect(card.getByRole("img", { name: image.alt, exact: true })).toHaveCount(1);
      }
      await expect(card.locator(SLIDE)).toHaveCount(room.images.length > 1 ? room.images.length : 0);
    }

    // Dữ liệu có cấu trúc cho công cụ tìm kiếm.
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!) as {
      image: string[];
      amenityFeature: { "@type": string; name: string; value: boolean }[];
    };
    expect(jsonLd.image).toEqual([hotel.imageUrl, ...hotel.images.map((image) => image.url)]);
    expect(jsonLd.amenityFeature).toEqual(
      hotel.amenities.map((amenity) => ({ "@type": "LocationFeatureSpecification", name: amenity.name, value: true })),
    );
  }

  // Khách sạn đang ẩn, slug không có, và `featured` (có endpoint danh sách riêng ở API) đều là 404.
  for (const slug of ["resort-bien-xanh-nha-trang", "khong-ton-tai", "featured"]) {
    await page.goto(`/hotels/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Không tìm thấy trang bạn cần" })).toBeVisible();
  }
});

test("/hotels/[slug]: nút chuyển ảnh đổi ảnh đang xem và chạy vòng", async ({ page, request }) => {
  const hotel = await apiGet<HotelDetailResponse>(request, "/hotels/khach-san-doi-may-da-lat");
  await page.goto(`/hotels/${hotel.slug}`);

  const gallery = page.getByRole("region", { name: `Ảnh ${hotel.name}`, exact: true });
  const slides = gallery.locator(SLIDE);
  await expect(slides.first()).toBeInViewport({ ratio: 0.9 });

  // Playwright tự đợi nút hết bị khoá (carousel chỉ bật nút sau khi hydrate).
  await gallery.getByRole("button", { name: "Ảnh sau" }).click();
  await expect(slides.nth(1)).toBeInViewport({ ratio: 0.9 });
  await expect(slides.first()).not.toBeInViewport({ ratio: 0.5 });

  // Lùi hai lần từ ảnh thứ hai: quay vòng tới ảnh cuối.
  await gallery.getByRole("button", { name: "Ảnh trước" }).click();
  await expect(slides.first()).toBeInViewport({ ratio: 0.9 });
  await gallery.getByRole("button", { name: "Ảnh trước" }).click();
  await expect(slides.last()).toBeInViewport({ ratio: 0.9 });
});

test("/destinations hiện đủ điểm đến lấy từ API", async ({ page, request }) => {
  const destinations = await apiGet<DestinationResponse[]>(request, "/destinations");
  await page.goto("/destinations");

  await expect(page.getByRole("heading", { level: 1, name: "Điểm đến" })).toBeVisible();
  // Đếm đúng lưới thẻ (không dùng `listitem` chung: `main` còn có danh sách khác, ví dụ đường dẫn phân cấp).
  await expect(page.locator("main ul.grid > li")).toHaveCount(destinations.length);
  for (const destination of destinations) {
    await expect(page.locator("main").getByRole("link", { name: new RegExp(destination.name) })).toBeVisible();
  }
});

test("các trang dùng danh sách điểm đến/sân bay từ API: /tours, /hotels, /flights", async ({ page, request }) => {
  const destinations = await apiGet<DestinationResponse[]>(request, "/destinations");
  const airport = (await apiGet<AirportResponse[]>(request, "/airports"))[4]!;

  // /tours: chip lọc theo điểm đến.
  await page.goto("/tours");
  const filters = page.getByRole("navigation", { name: "Lọc theo điểm đến" });
  for (const destination of destinations.filter((d) => d.tourCount > 0)) {
    await expect(filters.getByRole("link", { name: destination.name })).toBeVisible();
  }

  // /hotels: ô chọn điểm đến của form tìm khách sạn.
  await page.goto("/hotels");
  await page.getByRole("combobox", { name: "Điểm đến" }).click();
  await expect(page.getByRole("option", { name: new RegExp(destinations[1]!.name) })).toBeVisible();
  await page.keyboard.press("Escape");

  // /flights: ô chọn sân bay, hiện đủ tên có mã IATA.
  await page.goto("/flights");
  await page.getByRole("combobox", { name: "Điểm đi" }).click();
  await expect(page.getByRole("option", { name: new RegExp(`${airport.city} \\(${airport.code}\\)`) })).toBeVisible();
});
