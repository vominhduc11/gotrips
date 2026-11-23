import { describe, expect, it } from "vitest";
import { airports } from "./airports";
import { destinations } from "./destinations";
import { flightRoutes } from "./flight-routes";
import { hotelRoomTypes } from "./hotel-room-types";
import { hotels } from "./hotels";

/**
 * Kiểm tra tính toàn vẹn của dữ liệu mock khách sạn/chặng bay: các khoá ngoại phải trỏ tới bản ghi có thật.
 * Khoá sai sẽ không báo lỗi lúc build (TypeScript chỉ biết `number`/`string`) mà chỉ làm thẻ biến mất âm thầm
 * hoặc ô tìm kiếm không nhận giá trị điền sẵn, nên cần test riêng.
 */

const unique = (values: unknown[]) => new Set(values).size === values.length;

describe("mock khách sạn", () => {
  it("id và slug là duy nhất", () => {
    expect(unique(hotels.map((h) => h.id))).toBe(true);
    expect(unique(hotels.map((h) => h.slug))).toBe(true);
    expect(unique(hotelRoomTypes.map((r) => r.id))).toBe(true);
  });

  it("mọi khách sạn trỏ tới điểm đến có thật", () => {
    const destinationIds = new Set(destinations.map((d) => d.id));
    for (const hotel of hotels) {
      expect(destinationIds.has(hotel.destinationId), `khách sạn ${hotel.id} có destinationId lạ`).toBe(true);
    }
  });

  it("mọi loại phòng trỏ tới khách sạn có thật, giá và sức chứa hợp lệ", () => {
    const hotelIds = new Set(hotels.map((h) => h.id));
    for (const room of hotelRoomTypes) {
      expect(hotelIds.has(room.hotelId), `loại phòng ${room.id} có hotelId lạ`).toBe(true);
      expect(room.pricePerNight).toBeGreaterThan(0);
      expect(room.maxGuests).toBeGreaterThanOrEqual(1);
    }
  });

  it("hạng sao là số nguyên 1–5 và điểm đánh giá trong 0–5", () => {
    for (const hotel of hotels) {
      expect(Number.isInteger(hotel.starRating)).toBe(true);
      expect(hotel.starRating).toBeGreaterThanOrEqual(1);
      expect(hotel.starRating).toBeLessThanOrEqual(5);
      expect(hotel.rating).toBeGreaterThanOrEqual(0);
      expect(hotel.rating).toBeLessThanOrEqual(5);
    }
  });

  it("có ít nhất một khách sạn ACTIVE và một khách sạn HIDDEN (để kiểm tra luật ẩn)", () => {
    expect(hotels.some((h) => h.status === "ACTIVE")).toBe(true);
    expect(hotels.some((h) => h.status === "HIDDEN")).toBe(true);
  });

  it("khách sạn HIDDEN vẫn có phòng, để luật ẩn được kiểm tra bằng trạng thái chứ không nhờ thiếu phòng", () => {
    for (const hotel of hotels.filter((h) => h.status === "HIDDEN")) {
      expect(hotelRoomTypes.some((r) => r.hotelId === hotel.id)).toBe(true);
    }
  });

  it("mọi khách sạn ACTIVE đều có ít nhất một loại phòng (nếu không thẻ sẽ biến mất)", () => {
    for (const hotel of hotels.filter((h) => h.status === "ACTIVE")) {
      expect(hotelRoomTypes.some((r) => r.hotelId === hotel.id), `khách sạn ${hotel.id} chưa có phòng`).toBe(true);
    }
  });

  it("ảnh là URL Unsplash dạng photo-* (next.config chỉ cho phép dạng này) và có alt", () => {
    for (const hotel of hotels) {
      expect(new URL(hotel.imageUrl).hostname).toBe("images.unsplash.com");
      expect(new URL(hotel.imageUrl).pathname).toMatch(/^\/photo-/);
      expect(hotel.imageAlt.trim()).not.toBe("");
    }
  });
});

describe("mock chặng bay", () => {
  const airportCodes = new Set(airports.map((a) => a.code));

  it("id là duy nhất và không có hai chặng trùng hướng", () => {
    expect(unique(flightRoutes.map((r) => r.id))).toBe(true);
    expect(unique(flightRoutes.map((r) => `${r.fromCode}-${r.toCode}`))).toBe(true);
  });

  it("mã sân bay hai đầu có trong bảng sân bay", () => {
    for (const route of flightRoutes) {
      expect(airportCodes.has(route.fromCode), `chặng ${route.id}: fromCode ${route.fromCode} lạ`).toBe(true);
      expect(airportCodes.has(route.toCode), `chặng ${route.id}: toCode ${route.toCode} lạ`).toBe(true);
    }
  });

  it("mỗi chặng có điểm đi khác điểm đến", () => {
    for (const route of flightRoutes) {
      expect(route.fromCode, `chặng ${route.id}`).not.toBe(route.toCode);
    }
  });

  it("thời gian bay và giá tham khảo là số dương", () => {
    for (const route of flightRoutes) {
      expect(route.durationMinutes).toBeGreaterThan(0);
      expect(route.referencePrice).toBeGreaterThan(0);
    }
  });

  it("ảnh là URL Unsplash dạng photo-* và có alt", () => {
    for (const route of flightRoutes) {
      expect(new URL(route.imageUrl).hostname).toBe("images.unsplash.com");
      expect(new URL(route.imageUrl).pathname).toMatch(/^\/photo-/);
      expect(route.imageAlt.trim()).not.toBe("");
    }
  });
});

describe("mock sân bay", () => {
  it("mã sân bay là 3 chữ in hoa và duy nhất (form tìm vé kiểm bằng regex này)", () => {
    expect(unique(airports.map((a) => a.code))).toBe(true);
    for (const airport of airports) expect(airport.code).toMatch(/^[A-Z]{3}$/);
  });
});
