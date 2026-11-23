import type { Airport } from "@/lib/types";

/**
 * Sân bay nội địa Việt Nam dùng cho ô tìm vé máy bay (mã IATA 3 chữ in hoa).
 * Sắp theo mức độ phổ biến (2 đầu mối lớn trước) để danh sách gợi ý mở ra là các điểm khách hay chọn nhất.
 */
export const airports: Airport[] = [
  { code: "SGN", name: "Sân bay Tân Sơn Nhất", city: "TP. Hồ Chí Minh" },
  { code: "HAN", name: "Sân bay Nội Bài", city: "Hà Nội" },
  { code: "DAD", name: "Sân bay quốc tế Đà Nẵng", city: "Đà Nẵng" },
  { code: "CXR", name: "Sân bay quốc tế Cam Ranh", city: "Nha Trang" },
  { code: "PQC", name: "Sân bay quốc tế Phú Quốc", city: "Phú Quốc" },
  { code: "DLI", name: "Sân bay Liên Khương", city: "Đà Lạt" },
  { code: "HPH", name: "Sân bay quốc tế Cát Bi", city: "Hải Phòng" },
  { code: "VDO", name: "Sân bay quốc tế Vân Đồn", city: "Quảng Ninh" },
  { code: "HUI", name: "Sân bay quốc tế Phú Bài", city: "Huế" },
  { code: "VII", name: "Sân bay quốc tế Vinh", city: "Vinh" },
  { code: "UIH", name: "Sân bay Phù Cát", city: "Quy Nhơn" },
  { code: "VCA", name: "Sân bay quốc tế Cần Thơ", city: "Cần Thơ" },
];
