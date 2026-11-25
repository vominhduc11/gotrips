import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { FlightSearchSection, FlightSearchSectionSkeleton } from "@/components/flight/FlightSearchSection";

// Metadata tĩnh: đọc `searchParams` trong `generateMetadata` sẽ khiến cả trang phải render theo request.
export const metadata: Metadata = {
  title: "Vé máy bay",
  description:
    "Tìm và đặt vé máy bay nội địa trên GoTrips: một chiều hoặc khứ hồi, chọn hạng ghế, xem giá cho cả đoàn trước khi đặt.",
};

/**
 * /flights — tìm vé máy bay. Tiêu đề nằm trong static shell; phần phụ thuộc URL (form điền sẵn, kết quả hoặc chặng bay
 * phổ biến) stream trong `<Suspense>`. Lượt tìm + chuyến đi đã chọn nằm trên URL.
 */
export default function FlightsPage({ searchParams }: PageProps<"/flights">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader
          title="Vé máy bay"
          description="Chọn điểm đi, điểm đến, ngày bay và số hành khách để tìm chuyến bay nội địa phù hợp."
        />
        <Suspense fallback={<FlightSearchSectionSkeleton />}>
          <FlightSearchSection searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}
