import { describe, expect, it } from "vitest";
import { CabinClass, PassengerType, type FlightOptionResponse } from "@/lib/api/generated/model";
import { CABIN_OPTIONS } from "@/lib/schemas/flight-search";
import {
  API_CABIN,
  API_PASSENGER_TYPE,
  isValidScheduleId,
  toFlightOptionView,
  toSearchFlightsParams,
  toWebCabin,
  toWebPassengerType,
} from "./flight-request";

describe("ánh xạ hạng ghế web ↔ API", () => {
  it("mọi hạng ghế của form đều ánh xạ sang API và quay về đúng giá trị cũ", () => {
    for (const { value } of CABIN_OPTIONS) expect(toWebCabin(API_CABIN[value])).toBe(value);
  });

  it("mọi hạng ghế của API đều có giá trị trên web", () => {
    expect(Object.values(CabinClass).map(toWebCabin).sort()).toEqual(CABIN_OPTIONS.map((o) => o.value).sort());
    expect(API_CABIN.premiumEconomy).toBe("PREMIUM_ECONOMY");
  });

  it("loại hành khách đi và về khớp nhau", () => {
    for (const type of Object.values(PassengerType)) expect(API_PASSENGER_TYPE[toWebPassengerType(type)]).toBe(type);
    expect(API_PASSENGER_TYPE.infant).toBe("INFANT");
  });
});

describe("toSearchFlightsParams / toFlightOptionView", () => {
  const query = {
    from: "SGN",
    to: "HAN",
    date: "2027-06-10",
    cabin: "business" as const,
    adults: 2,
    children: 1,
    infants: 1,
  };

  it("gửi đủ lượt tìm cho API (kể cả số hành khách để tính còn đủ ghế)", () => {
    expect(toSearchFlightsParams(query)).toEqual({ ...query, cabin: "BUSINESS" });
  });

  it("chuyến bay từ API giữ nguyên mọi trường, chỉ đổi hạng ghế sang giá trị của web", () => {
    const flight: FlightOptionResponse = {
      scheduleId: 2,
      airline: { code: "MT", name: "Mây Trời Airlines" },
      flightNumber: "MT113",
      from: { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh" },
      to: { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội" },
      date: "2027-06-10",
      departTime: "08:30",
      arriveTime: "10:35",
      arrivesNextDay: false,
      durationMinutes: 125,
      cabin: "BUSINESS",
      fares: { adult: 4_172_000, child: 3_129_000, infant: 417_000 },
      seatsLeft: 16,
      isBookable: true,
    };
    expect(toFlightOptionView(flight)).toEqual({ ...flight, cabin: "business" });
  });
});

describe("isValidScheduleId", () => {
  it("chỉ nhận số nguyên dương (id đi thẳng vào đường dẫn API)", () => {
    expect(isValidScheduleId(1)).toBe(true);
    for (const id of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(isValidScheduleId(id)).toBe(false);
    }
  });
});
