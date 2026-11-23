import { describe, expect, it } from "vitest";
import type { Airport, FlightRoute } from "@/lib/types";
import { selectPopularFlightRoutes, toFlightRouteCardView } from "./flight-route-view";

const airports: Airport[] = [
  { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh" },
  { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội" },
  { code: "DAD", name: "Sân bay quốc tế Đà Nẵng", city: "Đà Nẵng" },
];

function makeRoute(overrides: Partial<FlightRoute> & Pick<FlightRoute, "id">): FlightRoute {
  return {
    fromCode: "SGN",
    toCode: "HAN",
    durationMinutes: 125,
    referencePrice: 1_390_000,
    imageUrl: "https://images.unsplash.com/photo-a",
    imageAlt: "Ảnh",
    ...overrides,
  };
}

describe("toFlightRouteCardView", () => {
  it("ghép thông tin sân bay và thành phố của hai đầu", () => {
    const view = toFlightRouteCardView(makeRoute({ id: 1, fromCode: "SGN", toCode: "HAN" }), airports);

    expect(view).toMatchObject({
      id: 1,
      from: { code: "SGN", city: "TP. Hồ Chí Minh", name: "Sân bay Tân Sơn Nhất" },
      to: { code: "HAN", city: "Hà Nội", name: "Sân bay Nội Bài" },
      durationMinutes: 125,
      referencePrice: 1_390_000,
    });
  });

  it("thiếu sân bay ở một trong hai đầu thì không dựng được thẻ (null)", () => {
    expect(toFlightRouteCardView(makeRoute({ id: 1, fromCode: "XXX" }), airports)).toBeNull();
    expect(toFlightRouteCardView(makeRoute({ id: 1, toCode: "XXX" }), airports)).toBeNull();
  });

  it("điểm đi trùng điểm đến thì không dựng được thẻ (null)", () => {
    expect(toFlightRouteCardView(makeRoute({ id: 1, fromCode: "SGN", toCode: "SGN" }), airports)).toBeNull();
  });
});

describe("selectPopularFlightRoutes", () => {
  it("bỏ chặng không hợp lệ và giữ nguyên thứ tự đầu vào", () => {
    const routes = [
      makeRoute({ id: 1, fromCode: "SGN", toCode: "HAN" }),
      makeRoute({ id: 2, fromCode: "SGN", toCode: "XXX" }),
      makeRoute({ id: 3, fromCode: "HAN", toCode: "HAN" }),
      makeRoute({ id: 4, fromCode: "SGN", toCode: "DAD" }),
    ];

    expect(selectPopularFlightRoutes(routes, airports, 10).map((r) => r.id)).toEqual([1, 4]);
  });

  it("cắt theo limit sau khi đã bỏ chặng không hợp lệ", () => {
    const routes = [
      makeRoute({ id: 1, toCode: "XXX" }),
      makeRoute({ id: 2, toCode: "HAN" }),
      makeRoute({ id: 3, toCode: "DAD" }),
    ];

    expect(selectPopularFlightRoutes(routes, airports, 1).map((r) => r.id)).toEqual([2]);
    expect(selectPopularFlightRoutes(routes, airports, 0)).toEqual([]);
  });
});
