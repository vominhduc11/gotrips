import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { TourListing, TourListingSkeleton } from "@/components/tour/TourListing";

// Metadata tĩnh: đọc `searchParams` trong `generateMetadata` sẽ khiến cả trang phải render theo request.
export const metadata: Metadata = {
  title: "Tour du lịch",
  description:
    "Danh sách tour du lịch trong nước trên GoTrips: lọc theo điểm đến, ngày khởi hành, số khách; giá minh bạch và lịch khởi hành rõ ràng.",
};

/**
 * /tours — danh sách tour. Tiêu đề nằm trong static shell; phần phụ thuộc URL (`TourListing`) được stream
 * sau trong `<Suspense>` nên `searchParams` không làm cả trang mất prerender.
 * Bộ lọc/sắp xếp/phân trang đều ở URL search params: `destination`, `q`, `date`, `guests`, `sort`, `page`.
 */
export default function ToursPage({ searchParams }: PageProps<"/tours">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader
          title="Tour du lịch"
          description="Chọn điểm đến, ngày khởi hành và số khách để tìm hành trình phù hợp. Giá hiển thị là giá thấp nhất cho mỗi khách."
        />

        <div className="mt-8">
          <Suspense fallback={<TourListingSkeleton />}>
            <TourListing searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
