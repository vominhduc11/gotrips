import type { Testimonial } from "@/lib/types";

/** Nhận xét mẫu (tên và nội dung hư cấu cho prototype). */
export const testimonials: Testimonial[] = [
  {
    id: 1,
    tourId: 3,
    customerName: "Nguyễn Minh Anh",
    customerCity: "TP. Hồ Chí Minh",
    rating: 5,
    content:
      "Giá hiển thị rõ ràng ngay từ đầu, đặt xong nhận xác nhận rất nhanh. Hướng dẫn viên nhiệt tình, cả nhà mình đều hài lòng.",
  },
  {
    id: 2,
    tourId: 5,
    customerName: "Trần Quốc Bảo",
    customerCity: "Hà Nội",
    rating: 5,
    content:
      "Ngủ đêm trên du thuyền là trải nghiệm đáng nhớ. Lịch trình hợp lý, không bị nhồi nhét điểm tham quan.",
  },
  {
    id: 3,
    tourId: 1,
    customerName: "Lê Thu Hà",
    customerCity: "Đà Nẵng",
    rating: 4,
    content:
      "Đà Lạt đẹp và lịch trình thoải mái. Mình chọn đúng ngày còn chỗ nên đặt rất dễ, chỉ tiếc trời hơi lạnh hơn dự kiến.",
  },
  {
    id: 4,
    tourId: 4,
    customerName: "Phạm Hoàng Nam",
    customerCity: "Cần Thơ",
    rating: 5,
    content:
      "Lần đầu lặn biển nhưng được hướng dẫn rất kỹ. Đội ngũ hỗ trợ trả lời tin nhắn cả buổi tối, mình thấy yên tâm hẳn.",
  },
];
