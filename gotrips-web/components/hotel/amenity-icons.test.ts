import { Check } from "lucide-react";
import { describe, expect, it } from "vitest";
import { getAmenityIcon } from "./amenity-icons";

// Các code của danh mục tiện ích trong seed của gotrips-api (`R__seed_catalog.sql`).
const SEED_CODES = [
  "pool",
  "beach",
  "spa",
  "gym",
  "restaurant",
  "bar",
  "breakfast",
  "wifi",
  "kids-club",
  "garden-bbq",
  "fireplace",
  "parking",
  "airport-shuttle",
  "motorbike-rental",
  "bicycle",
  "tour-desk",
  "air-conditioning",
  "tv",
  "minibar",
  "kettle",
  "bathtub",
  "balcony",
  "safe",
];

describe("getAmenityIcon", () => {
  it("mỗi tiện ích trong danh mục có một biểu tượng riêng, khác dấu tích mặc định", () => {
    const icons = SEED_CODES.map(getAmenityIcon);

    expect(icons).not.toContain(Check);
    expect(new Set(icons).size).toBe(SEED_CODES.length);
  });

  it.each(["tien-ich-moi", "constructor", "toString", "__proto__", ""])(
    "code lạ %j dùng dấu tích mặc định (kể cả tên có sẵn trên prototype)",
    (code) => {
      expect(getAmenityIcon(code)).toBe(Check);
    },
  );
});
