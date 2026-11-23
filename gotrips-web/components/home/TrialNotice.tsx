import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Dòng báo ở đầu panel Khách sạn và Vé máy bay của ô tìm kiếm: hai dịch vụ này mới là bản thử nghiệm.
 *
 * `role="note"` thay cho `role="alert"` mặc định của `Alert`: đây là thông tin tĩnh luôn hiện sẵn, không phải cảnh báo
 * bất ngờ nên không được ngắt lời trình đọc màn hình; và `role="alert"` còn dùng cho thông báo lỗi của form bên dưới
 * (test và người dùng trình đọc màn hình phân biệt lỗi với ghi chú nhờ role này).
 * Màu chỉ dùng token: chữ `accent-800` trên nền `accent-50` đạt tương phản AA.
 */
export function TrialNotice() {
  return (
    <Alert role="note" className="mb-4 rounded-control border-accent-200 bg-accent-50 px-3 py-2.5 text-accent-800">
      <FlaskConical aria-hidden="true" />
      <AlertDescription className="text-sm font-medium text-accent-800">
        Bản thử nghiệm: bạn có thể thử tìm kiếm, nhưng chưa xem được kết quả và chưa đặt được.
      </AlertDescription>
    </Alert>
  );
}
