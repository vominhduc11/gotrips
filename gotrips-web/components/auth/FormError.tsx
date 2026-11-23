import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Lỗi chung của cả form (không thuộc ô nào), ví dụ lỗi từ server. Trả `null` khi không có lỗi. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="border-danger-700/30 bg-danger-50 px-4 py-3">
      <CircleAlert aria-hidden="true" />
      <AlertDescription className="text-danger-700">{message}</AlertDescription>
    </Alert>
  );
}
