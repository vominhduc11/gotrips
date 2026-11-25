import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { HotelSearchSection, HotelSearchSectionSkeleton } from "@/components/hotel/HotelSearchSection";

// Metadata tĩnh: đọc `searchParams` trong `generateMetadata` sẽ khiến cả trang phải render theo request.
export const metadata: Metadata = {
  title: "Khách sạn",
  description:
    "Tìm và đặt khách sạn tại các điểm đến du lịch trong nước trên GoTrips: chọn ngày nhận – trả phòng, số khách, xem tổng tiền cả kỳ lưu trú.",
};

/**
 * /hotels — tìm khách sạn. Tiêu đề nằm trong static shell; phần phụ thuộc URL (form điền sẵn, kết quả hoặc gợi ý) stream
 * trong `<Suspense>`. Lượt tìm nằm trên URL: `destination`, `checkIn`, `checkOut`, `guests`, `rooms`.
 */
export default function HotelsPage({ searchParams }: PageProps<"/hotels">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader
          title="Khách sạn"
          description="Chọn điểm đến, ngày nhận – trả phòng và số khách để tìm nơi lưu trú phù hợp."
        />
        <Suspense fallback={<HotelSearchSectionSkeleton />}>
          <HotelSearchSection searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}
