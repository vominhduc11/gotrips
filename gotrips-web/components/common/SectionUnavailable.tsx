import { cn } from "@/lib/cn";

/**
 * Thông báo cục bộ khi một khối dữ liệu không tải được từ API (API sập, quá chậm...). Khác với trạng thái RỖNG hợp lệ
 * ("chưa có tour nào"): ở đây là lỗi tạm thời nên lời nhắn hướng khách thử lại sau, và phần còn lại của trang vẫn dùng bình thường.
 * `role="status"` (không phải `alert`): lỗi này xuất hiện ngay lúc tải trang, không nên ngắt lời trình đọc màn hình.
 * Nơi dùng truyền màu nền/đổ bóng qua `className` cho hợp với nền của section.
 */
export function SectionUnavailable({ what, className }: { what: string; className?: string }) {
  return (
    <p role="status" className={cn("rounded-card p-8 text-center text-ink-muted", className)}>
      Chưa tải được {what}. Vui lòng thử lại sau ít phút.
    </p>
  );
}
