import { describe, expect, it } from "vitest";
import type { Airline, Airport, FlightSchedule } from "@/lib/types";
import {
  addMinutesToTime,
  buildFareLines,
  computeFares,
  computeFlightTotal,
  computeSegmentTotal,
  countPassengers,
  findFlightOption,
  findFlightOptions,
  findRouteImage,
  summarizePassengers,
  toFlightOptionView,
} from "./flight-view";

const airlines: Airline[] = [{ code: "SV", name: "Sao Việt Air" }];
const airports: Airport[] = [
  { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh" },
  { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội" },
];

function makeSchedule(overrides: Partial<FlightSchedule> & Pick<FlightSchedule, "id">): FlightSchedule {
  return {
    airlineCode: "SV",
    flightNumber: `SV${overrides.id}`,
    fromCode: "SGN",
    toCode: "HAN",
    departTime: "08:00",
    durationMinutes: 125,
    economyFare: 1_490_000,
    ...overrides,
  };
}

describe("computeFares", () => {
  it("Phổ thông: người lớn = giá gốc, trẻ em 75%, em bé 10%, làm tròn tới nghìn", () => {
    expect(computeFares(1_490_000, "economy")).toEqual({ adult: 1_490_000, child: 1_118_000, infant: 149_000 });
  });

  it("hạng ghế cao hơn nhân hệ số rồi mới tính trẻ em / em bé", () => {
    expect(computeFares(1_000_000, "business")).toEqual({ adult: 2_800_000, child: 2_100_000, infant: 280_000 });
    expect(computeFares(1_000_000, "premiumEconomy").adult).toBe(1_600_000);
    expect(computeFares(1_000_000, "first").adult).toBe(4_200_000);
  });
});

describe("tổng tiền vé", () => {
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
      { label: "Chiều đi: 1.000.000\u00a0₫ × 2 người lớn", amount: 2_000_000 },
      { label: "Chiều đi: 100.000\u00a0₫ × 1 em bé", amount: 100_000 },
    ]);
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

describe("addMinutesToTime", () => {
  it("cộng phút trong ngày", () => {
    expect(addMinutesToTime("06:00", 125)).toEqual({ time: "08:05", nextDay: false });
  });

  it("qua nửa đêm thì sang ngày hôm sau", () => {
    expect(addMinutesToTime("22:30", 130)).toEqual({ time: "00:40", nextDay: true });
    expect(addMinutesToTime("23:00", 60)).toEqual({ time: "00:00", nextDay: true });
  });
});

describe("chuyến bay theo ngày", () => {
  const schedules = [
    makeSchedule({ id: 2, departTime: "13:00" }),
    makeSchedule({ id: 1, departTime: "06:00" }),
    makeSchedule({ id: 3, fromCode: "HAN", toCode: "SGN" }),
    makeSchedule({ id: 4, airlineCode: "XX" }),
  ];
  const query = { from: "SGN", to: "HAN", date: "2027-01-10", cabin: "economy" as const };

  it("chỉ đúng chiều, sắp theo giờ cất cánh, bỏ lịch bay thiếu hãng", () => {
    expect(findFlightOptions(schedules, airlines, airports, query).map((f) => f.scheduleId)).toEqual([1, 2]);
  });

  it("ghép đủ thông tin chuyến bay", () => {
    expect(toFlightOptionView(schedules[1]!, "2027-01-10", "economy", airlines, airports)).toMatchObject({
      scheduleId: 1,
      airline: { name: "Sao Việt Air" },
      from: { city: "TP. Hồ Chí Minh" },
      to: { city: "Hà Nội" },
      date: "2027-01-10",
      departTime: "06:00",
      arriveTime: "08:05",
      arrivesNextDay: false,
      fares: { adult: 1_490_000 },
    });
  });

  it("findFlightOption: id phải đúng chiều (id chiều ngược lại → null)", () => {
    expect(findFlightOption(schedules, airlines, airports, { ...query, scheduleId: 2 })?.departTime).toBe("13:00");
    expect(findFlightOption(schedules, airlines, airports, { ...query, scheduleId: 3 })).toBeNull();
    expect(findFlightOption(schedules, airlines, airports, { ...query, scheduleId: 99 })).toBeNull();
  });
});

describe("findRouteImage", () => {
  const fallback = { imageUrl: "fallback", imageAlt: "Ảnh chung" };
  it("lấy ảnh chặng phổ biến cùng điểm đến, không có thì dùng ảnh mặc định", () => {
    const routes = [{ toCode: "HAN", imageUrl: "han", imageAlt: "Hà Nội" }];
    expect(findRouteImage(routes, "HAN", fallback)).toEqual({ imageUrl: "han", imageAlt: "Hà Nội" });
    expect(findRouteImage(routes, "PQC", fallback)).toEqual(fallback);
  });
});
