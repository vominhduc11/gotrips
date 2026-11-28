import { unstable_rethrow } from "next/navigation";
import { getMyBookingPaymentStatus } from "@/lib/data/bookings";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Trạng thái thanh toán của một đơn của người đang đăng nhập, cho trang chi tiết đơn hỏi lại từ trình duyệt (xem
 * `lib/booking/payment-status.ts`). Proxy qua server vì token nằm trong cookie httpOnly. Dữ liệu riêng từng người nên
 * luôn `no-store`. Mã sai định dạng, không có hoặc đơn của người khác đều 404 như nhau.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const result = await getMyBookingPaymentStatus(code);
    if (result.status === "unauthenticated") {
      return Response.json({ error: "Cần đăng nhập" }, { status: 401, headers: NO_STORE });
    }
    if (!result.data) return Response.json({ error: "Không tìm thấy đơn" }, { status: 404, headers: NO_STORE });
    return Response.json(result.data, { headers: NO_STORE });
  } catch (error) {
    unstable_rethrow(error);
    // Chỉ ghi nguyên nhân; không ghi token hay dữ liệu của khách. Trang vẫn hỏi lại lần sau.
    console.error("Không đọc được trạng thái thanh toán từ gotrips-api:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Hệ thống đang bận" }, { status: 503, headers: NO_STORE });
  }
}
