import { FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/cn";

/**
 * Dòng báo "Bản thử nghiệm" ở các trang đặt tour / đặt phòng / đặt vé và trang đơn: đơn chỉ lưu trên trình duyệt, chưa
 * thu tiền thật.
 *
 * `role="note"` thay cho `role="alert"` mặc định của `Alert`: đây là thông tin tĩnh luôn hiện sẵn, không phải cảnh báo
 * bất ngờ nên không được ngắt lời trình đọc màn hình; và `role="alert"` còn dùng cho thông báo lỗi của form bên dưới
 * (test và người dùng trình đọc màn hình phân biệt lỗi với ghi chú nhờ role này).
 * Màu chỉ dùng token: chữ `accent-800` trên nền `accent-50` đạt tương phản AA.
 */
export function TrialNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Alert
      role="note"
      className={cn("mb-4 rounded-control border-accent-200 bg-accent-50 px-3 py-2.5 text-accent-800", className)}
    >
      <FlaskConical aria-hidden="true" />
      <AlertDescription className="text-sm font-medium text-accent-800">
        {children}
      </AlertDescription>
    </Alert>
  );
}
