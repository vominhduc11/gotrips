import type { TourDeparture } from "@/lib/types";

/**
 * Bảng `tour_departures` — ngày cố định ở tương lai (từ 01/2027), trải đến 04/2027.
 * Khi các ngày này lùi vào quá khứ, tour sẽ tự biến mất khỏi danh sách (đúng nghiệp vụ) → cần làm mới mock.
 *
 * Các trường hợp biên có chủ đích:
 *  - Tour 1: chuyến 09/01 HẾT CHỖ và rẻ nhất → phải bị bỏ qua khi tính "giá từ"/"ngày gần nhất";
 *            "giá từ" (chuyến 13/03) khác chuyến gần nhất (23/01).
 *  - Tour 3: có `originalPrice` (giảm giá).
 *  - Tour 5: chuyến gần nhất chỉ còn 3 chỗ → nhãn "Sắp hết chỗ".
 *  - Tour 7: thuộc tour HIDDEN.
 *  - Tour 8: chuyến 18/03 hết chỗ.
 */
export const departures: TourDeparture[] = [
  // Tour 1 – Đà Lạt 3N2Đ
  { id: 1, tourId: 1, departureDate: "2027-01-09", price: 3_190_000, totalSeats: 20, bookedSeats: 20 },
  { id: 2, tourId: 1, departureDate: "2027-01-23", price: 3_490_000, totalSeats: 20, bookedSeats: 11 },
  { id: 3, tourId: 1, departureDate: "2027-02-20", price: 3_390_000, totalSeats: 20, bookedSeats: 6 },
  { id: 4, tourId: 1, departureDate: "2027-03-13", price: 3_290_000, totalSeats: 20, bookedSeats: 16 },

  // Tour 2 – Đà Lạt 2N1Đ
  { id: 5, tourId: 2, departureDate: "2027-01-16", price: 2_190_000, totalSeats: 16, bookedSeats: 9 },
  { id: 6, tourId: 2, departureDate: "2027-02-27", price: 2_290_000, totalSeats: 16, bookedSeats: 12 },
  { id: 7, tourId: 2, departureDate: "2027-03-20", price: 2_390_000, totalSeats: 16, bookedSeats: 4 },

  // Tour 3 – Phú Quốc 4N3Đ (đang giảm giá)
  { id: 8, tourId: 3, departureDate: "2027-01-14", price: 8_990_000, originalPrice: 10_990_000, totalSeats: 24, bookedSeats: 14 },
  { id: 9, tourId: 3, departureDate: "2027-02-25", price: 9_490_000, originalPrice: 11_490_000, totalSeats: 24, bookedSeats: 20 },
  { id: 10, tourId: 3, departureDate: "2027-04-08", price: 8_490_000, originalPrice: 10_490_000, totalSeats: 24, bookedSeats: 9 },

  // Tour 4 – Nha Trang 3N2Đ
  { id: 11, tourId: 4, departureDate: "2027-01-30", price: 4_590_000, totalSeats: 18, bookedSeats: 7 },
  { id: 12, tourId: 4, departureDate: "2027-03-06", price: 4_790_000, totalSeats: 18, bookedSeats: 12 },
  { id: 13, tourId: 4, departureDate: "2027-04-24", price: 4_490_000, totalSeats: 18, bookedSeats: 16 },

  // Tour 5 – Hạ Long 2N1Đ (chuyến gần nhất còn 3 chỗ)
  { id: 14, tourId: 5, departureDate: "2027-01-17", price: 3_890_000, totalSeats: 20, bookedSeats: 17 },
  { id: 15, tourId: 5, departureDate: "2027-02-28", price: 4_190_000, totalSeats: 20, bookedSeats: 8 },
  { id: 16, tourId: 5, departureDate: "2027-03-27", price: 3_990_000, totalSeats: 20, bookedSeats: 10 },

  // Tour 6 – Sapa 3N2Đ
  { id: 17, tourId: 6, departureDate: "2027-01-22", price: 3_990_000, totalSeats: 16, bookedSeats: 6 },
  { id: 18, tourId: 6, departureDate: "2027-02-19", price: 4_290_000, totalSeats: 16, bookedSeats: 10 },
  { id: 19, tourId: 6, departureDate: "2027-03-12", price: 4_090_000, totalSeats: 16, bookedSeats: 13 },

  // Tour 7 – Sapa 4N3Đ Fansipan (HIDDEN)
  { id: 20, tourId: 7, departureDate: "2027-01-29", price: 5_490_000, totalSeats: 12, bookedSeats: 5 },
  { id: 21, tourId: 7, departureDate: "2027-03-05", price: 5_690_000, totalSeats: 12, bookedSeats: 10 },

  // Tour 8 – Đà Nẵng – Hội An 4N3Đ
  { id: 22, tourId: 8, departureDate: "2027-01-21", price: 6_290_000, totalSeats: 22, bookedSeats: 9 },
  { id: 23, tourId: 8, departureDate: "2027-02-18", price: 6_490_000, totalSeats: 22, bookedSeats: 15 },
  { id: 24, tourId: 8, departureDate: "2027-03-18", price: 6_190_000, totalSeats: 22, bookedSeats: 22 },
  { id: 25, tourId: 8, departureDate: "2027-04-15", price: 6_390_000, totalSeats: 22, bookedSeats: 10 },

  // Tour 9 – Hạ Long – Ninh Bình 3N2Đ
  { id: 26, tourId: 9, departureDate: "2027-01-31", price: 4_290_000, totalSeats: 18, bookedSeats: 8 },
  { id: 27, tourId: 9, departureDate: "2027-03-07", price: 4_490_000, totalSeats: 18, bookedSeats: 10 },
];
