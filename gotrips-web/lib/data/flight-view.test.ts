import { describe, expect, it } from "vitest";
import {
  buildFareLines,
  computeFlightTotal,
  computeSegmentTotal,
  countPassengers,
  fareLineLabel,
  summarizePassengers,
} from "./flight-view";

// Giá theo hạng ghế, giờ hạ cánh, lọc chuyến theo chặng do gotrips-api tính (`FlightFareCalculatorTests`,
// `FlightSearchControllerTests`); ở đây chỉ còn các hàm phục vụ hiển thị và tạm tính.

describe("tạm tính tiền vé", () => {
  const fares = { adult: 1_000_000, child: 750_000, infant: 100_000 };
  const counts = { adults: 2, children: 1, infants: 1 };

  it("một chặng = cộng theo từng loại hành khách", () => {
    expect(computeSegmentTotal(fares, counts)).toBe(2_850_000);
  });

  it("khứ hồi = cộng hai chặng", () => {
    expect(computeFlightTotal([{ fares }, { fares: { ...fares, adult: 500_000 } }], counts)).toBe(2_850_000 + 1_850_000);
  });

  it("dòng tính tiền: mỗi chặng × mỗi loại có mặt, bỏ loại bằng 0", () => {
    expect(buildFareLines([{ fares }], { adults: 2, children: 0, infants: 1 })).toEqual([
      { label: "Chiều đi: 1.000.000 ₫ × 2 người lớn", amount: 2_000_000 },
      { label: "Chiều đi: 100.000 ₫ × 1 em bé", amount: 100_000 },
    ]);
  });

  it("nhãn dòng tính tiền theo chiều và loại hành khách", () => {
    expect(fareLineLabel(1, 750_000, 3, "child")).toBe("Chiều về: 750.000 ₫ × 3 trẻ em");
  });
});

describe("hành khách", () => {
  it("countPassengers đếm theo loại", () => {
    expect(countPassengers([{ type: "adult" }, { type: "infant" }, { type: "adult" }])).toEqual({
      adults: 2,
      children: 0,
      infants: 1,
    });
  });

  it("summarizePassengers bỏ nhóm bằng 0", () => {
    expect(summarizePassengers(1, 0, 0)).toBe("1 người lớn");
    expect(summarizePassengers(2, 1, 1)).toBe("2 người lớn, 1 trẻ em, 1 em bé");
  });
});
