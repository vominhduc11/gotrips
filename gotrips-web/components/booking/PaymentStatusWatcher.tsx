"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  bookingPaymentStatusQuery,
  hasPaymentChanged,
  nextPollDelay,
  type PaymentSnapshot,
} from "@/lib/booking/payment-status";

/**
 * Hỏi lại trạng thái thanh toán mỗi vài giây khi khách đang chờ chuyển khoản. Thấy khác lúc dựng trang (nhận thêm tiền,
 * đủ tiền, đơn được xác nhận) thì `router.refresh()` để Server Component đọc lại đơn: số tiền còn thiếu, mã QR và trạng
 * thái đều do server dựng, ở đây không tự vẽ lại phần nào.
 *
 * Chỉ hỏi khi tab đang mở (mặc định của TanStack Query) và ngừng sau một lúc (`nextPollDelay`).
 */
export function PaymentStatusWatcher({ code, initial }: { code: string; initial: PaymentSnapshot }) {
  const router = useRouter();
  const client = useQueryClient();
  const options = bookingPaymentStatusQuery(code);
  const query = useQuery({
    ...options,
    refetchInterval: (q) => nextPollDelay(q.state.dataUpdateCount + q.state.errorUpdateCount, q.state.error),
  });

  // Mỗi trạng thái mới chỉ làm mới một lần: trong lúc `refresh` chạy, lần hỏi sau vẫn thấy khác `initial` cũ.
  const refreshedFor = useRef<string | null>(null);
  const latest = query.data;
  const { status, paymentStatus, receivedAmount } = initial;
  useEffect(() => {
    if (!latest || !hasPaymentChanged({ status, paymentStatus, receivedAmount }, latest)) return;
    const key = `${latest.status}:${latest.paymentStatus}:${latest.receivedAmount}`;
    if (refreshedFor.current === key) return;
    refreshedFor.current = key;
    router.refresh();
  }, [latest, status, paymentStatus, receivedAmount, router]);

  // Số lần đã hỏi chỉ có trên state của query (kết quả `useQuery` không có `dataUpdateCount`); component render lại mỗi
  // lần query đổi nên đọc thẳng ở đây vẫn mới.
  const state = client.getQueryState(options.queryKey);
  const stopped =
    !query.isFetching &&
    state !== undefined &&
    nextPollDelay(state.dataUpdateCount + state.errorUpdateCount, state.error) === false;

  return (
    <p role="status" className="flex items-center gap-2 text-ink-muted">
      {stopped ? (
        "Trang đã ngừng tự kiểm tra thanh toán. Tải lại trang để xem trạng thái mới nhất."
      ) : (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          Đang chờ chuyển khoản. Trang tự cập nhật khi GoTrips nhận được tiền.
        </>
      )}
    </p>
  );
}
