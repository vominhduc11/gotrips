import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingDetail } from "@/components/booking/BookingDetail";
import { BookingDetailSkeleton } from "@/components/booking/BookingSkeletons";
import { Container } from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Chi tiết đơn đặt chỗ",
  robots: { index: false },
};

/**
 * Mã đơn không biết trước (không có `generateStaticParams`) nên `params` là dữ liệu theo yêu cầu: truyền nguyên
 * Promise xuống phần trong Suspense, cùng chỗ đọc cookie. Shell của trang (Header, Footer) vẫn prerender.
 */
export default function BookingDetailPage({ params }: PageProps<"/bookings/[code]">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Suspense fallback={<BookingDetailSkeleton />}>
          <BookingDetail params={params} />
        </Suspense>
      </Container>
    </div>
  );
}
