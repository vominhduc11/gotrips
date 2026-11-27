import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingHistory } from "@/components/booking/BookingHistory";
import { BookingListSkeleton } from "@/components/booking/BookingSkeletons";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";

export const metadata: Metadata = {
  title: "Đơn đặt chỗ của tôi",
  description: "Xem lại tour, khách sạn và vé máy bay bạn đã đặt, trạng thái xác nhận và thanh toán.",
  robots: { index: false },
};

/** Tiêu đề prerender sẵn; danh sách đọc cookie phiên rồi gọi API nên stream trong Suspense. */
export default function MyBookingsPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader
          title="Đơn đặt chỗ của tôi"
          description="Theo dõi trạng thái xác nhận và thanh toán của tour, khách sạn và vé máy bay bạn đã đặt."
        />
        <div className="mt-8">
          <Suspense fallback={<BookingListSkeleton />}>
            <BookingHistory />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
