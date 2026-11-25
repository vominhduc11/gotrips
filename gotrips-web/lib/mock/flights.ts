import type { Airline, FlightSchedule } from "@/lib/types";

/**
 * Bảng `airlines` — hãng bay TÊN GIẢ cho bản demo (không phải hãng thật). Mã 2 ký tự là tiền tố số hiệu chuyến bay.
 */
export const airlines: Airline[] = [
  { code: "SV", name: "Sao Việt Air" },
  { code: "MT", name: "Mây Trời Airlines" },
  { code: "CD", name: "Cánh Diều Air" },
];

/**
 * Bảng `flight_schedules` — lịch bay cố định, mỗi lịch bay chạy MỖI NGÀY cùng giờ (đủ cho bản demo: tìm ngày nào cũng
 * có chuyến). `fromCode`/`toCode` phải có trong `airports.ts`, `airlineCode` phải có trong `airlines` (có test kiểm).
 * `economyFare` là giá hạng Phổ thông cho một người lớn, đã gồm thuế phí; số minh hoạ, không phải giá bán.
 *
 * Mỗi chặng có lịch bay cả hai chiều để tìm khứ hồi được. Chuyến SV236 (HAN → PQC, 22:30) hạ cánh sau nửa đêm, để
 * kiểm tra hiển thị "+1 ngày".
 */
export const flightSchedules: FlightSchedule[] = [
  // TP. Hồ Chí Minh ⇄ Hà Nội
  { id: 1, airlineCode: "SV", flightNumber: "SV201", fromCode: "SGN", toCode: "HAN", departTime: "06:00", durationMinutes: 125, economyFare: 1_690_000 },
  { id: 2, airlineCode: "MT", flightNumber: "MT113", fromCode: "SGN", toCode: "HAN", departTime: "08:30", durationMinutes: 125, economyFare: 1_490_000 },
  { id: 3, airlineCode: "CD", flightNumber: "CD305", fromCode: "SGN", toCode: "HAN", departTime: "13:15", durationMinutes: 130, economyFare: 1_390_000 },
  { id: 4, airlineCode: "SV", flightNumber: "SV219", fromCode: "SGN", toCode: "HAN", departTime: "19:45", durationMinutes: 125, economyFare: 1_590_000 },
  { id: 5, airlineCode: "MT", flightNumber: "MT114", fromCode: "HAN", toCode: "SGN", departTime: "06:30", durationMinutes: 125, economyFare: 1_450_000 },
  { id: 6, airlineCode: "SV", flightNumber: "SV202", fromCode: "HAN", toCode: "SGN", departTime: "09:00", durationMinutes: 125, economyFare: 1_650_000 },
  { id: 7, airlineCode: "CD", flightNumber: "CD306", fromCode: "HAN", toCode: "SGN", departTime: "15:40", durationMinutes: 130, economyFare: 1_350_000 },
  { id: 8, airlineCode: "SV", flightNumber: "SV220", fromCode: "HAN", toCode: "SGN", departTime: "21:00", durationMinutes: 125, economyFare: 1_550_000 },

  // TP. Hồ Chí Minh ⇄ Đà Nẵng
  { id: 9, airlineCode: "SV", flightNumber: "SV121", fromCode: "SGN", toCode: "DAD", departTime: "07:10", durationMinutes: 85, economyFare: 1_090_000 },
  { id: 10, airlineCode: "CD", flightNumber: "CD221", fromCode: "SGN", toCode: "DAD", departTime: "11:20", durationMinutes: 85, economyFare: 990_000 },
  { id: 11, airlineCode: "MT", flightNumber: "MT131", fromCode: "SGN", toCode: "DAD", departTime: "17:30", durationMinutes: 90, economyFare: 1_050_000 },
  { id: 12, airlineCode: "CD", flightNumber: "CD222", fromCode: "DAD", toCode: "SGN", departTime: "09:00", durationMinutes: 85, economyFare: 950_000 },
  { id: 13, airlineCode: "SV", flightNumber: "SV122", fromCode: "DAD", toCode: "SGN", departTime: "14:25", durationMinutes: 85, economyFare: 1_050_000 },
  { id: 14, airlineCode: "MT", flightNumber: "MT132", fromCode: "DAD", toCode: "SGN", departTime: "20:10", durationMinutes: 90, economyFare: 1_000_000 },

  // TP. Hồ Chí Minh ⇄ Phú Quốc
  { id: 15, airlineCode: "MT", flightNumber: "MT151", fromCode: "SGN", toCode: "PQC", departTime: "06:45", durationMinutes: 60, economyFare: 890_000 },
  { id: 16, airlineCode: "SV", flightNumber: "SV151", fromCode: "SGN", toCode: "PQC", departTime: "12:00", durationMinutes: 60, economyFare: 950_000 },
  { id: 17, airlineCode: "MT", flightNumber: "MT152", fromCode: "PQC", toCode: "SGN", departTime: "08:30", durationMinutes: 60, economyFare: 870_000 },
  { id: 18, airlineCode: "SV", flightNumber: "SV152", fromCode: "PQC", toCode: "SGN", departTime: "16:20", durationMinutes: 60, economyFare: 930_000 },

  // TP. Hồ Chí Minh ⇄ Nha Trang (Cam Ranh)
  { id: 19, airlineCode: "CD", flightNumber: "CD171", fromCode: "SGN", toCode: "CXR", departTime: "07:30", durationMinutes: 65, economyFare: 790_000 },
  { id: 20, airlineCode: "SV", flightNumber: "SV171", fromCode: "SGN", toCode: "CXR", departTime: "15:00", durationMinutes: 65, economyFare: 850_000 },
  { id: 21, airlineCode: "CD", flightNumber: "CD172", fromCode: "CXR", toCode: "SGN", departTime: "10:00", durationMinutes: 65, economyFare: 770_000 },
  { id: 22, airlineCode: "SV", flightNumber: "SV172", fromCode: "CXR", toCode: "SGN", departTime: "17:20", durationMinutes: 65, economyFare: 830_000 },

  // TP. Hồ Chí Minh ⇄ Đà Lạt
  { id: 23, airlineCode: "MT", flightNumber: "MT181", fromCode: "SGN", toCode: "DLI", departTime: "09:15", durationMinutes: 55, economyFare: 750_000 },
  { id: 24, airlineCode: "CD", flightNumber: "CD181", fromCode: "SGN", toCode: "DLI", departTime: "14:40", durationMinutes: 55, economyFare: 720_000 },
  { id: 25, airlineCode: "MT", flightNumber: "MT182", fromCode: "DLI", toCode: "SGN", departTime: "11:10", durationMinutes: 55, economyFare: 730_000 },
  { id: 26, airlineCode: "CD", flightNumber: "CD182", fromCode: "DLI", toCode: "SGN", departTime: "16:30", durationMinutes: 55, economyFare: 710_000 },

  // Hà Nội ⇄ Đà Nẵng
  { id: 27, airlineCode: "SV", flightNumber: "SV211", fromCode: "HAN", toCode: "DAD", departTime: "07:00", durationMinutes: 80, economyFare: 1_150_000 },
  { id: 28, airlineCode: "CD", flightNumber: "CD211", fromCode: "HAN", toCode: "DAD", departTime: "18:20", durationMinutes: 80, economyFare: 990_000 },
  { id: 29, airlineCode: "SV", flightNumber: "SV212", fromCode: "DAD", toCode: "HAN", departTime: "09:30", durationMinutes: 80, economyFare: 1_100_000 },
  { id: 30, airlineCode: "CD", flightNumber: "CD212", fromCode: "DAD", toCode: "HAN", departTime: "20:40", durationMinutes: 80, economyFare: 960_000 },

  // Hà Nội ⇄ Phú Quốc
  { id: 31, airlineCode: "MT", flightNumber: "MT235", fromCode: "HAN", toCode: "PQC", departTime: "08:00", durationMinutes: 130, economyFare: 1_790_000 },
  { id: 32, airlineCode: "SV", flightNumber: "SV236", fromCode: "HAN", toCode: "PQC", departTime: "22:30", durationMinutes: 130, economyFare: 1_690_000 },
  { id: 33, airlineCode: "MT", flightNumber: "MT236", fromCode: "PQC", toCode: "HAN", departTime: "11:30", durationMinutes: 130, economyFare: 1_750_000 },
  { id: 34, airlineCode: "SV", flightNumber: "SV237", fromCode: "PQC", toCode: "HAN", departTime: "18:00", durationMinutes: 130, economyFare: 1_650_000 },

  // Hà Nội ⇄ Nha Trang (Cam Ranh)
  { id: 35, airlineCode: "CD", flightNumber: "CD241", fromCode: "HAN", toCode: "CXR", departTime: "10:10", durationMinutes: 120, economyFare: 1_590_000 },
  { id: 36, airlineCode: "CD", flightNumber: "CD242", fromCode: "CXR", toCode: "HAN", departTime: "13:20", durationMinutes: 120, economyFare: 1_550_000 },
];
