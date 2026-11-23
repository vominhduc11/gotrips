import type { Metadata } from "next";
import { Suspense } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { TourListing, TourListingSkeleton } from "@/components/tour/TourListing";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <AppLink href="/">Trang chủ</AppLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Tour du lịch</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Tour du lịch</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-muted">
          Chọn điểm đến, ngày khởi hành và số khách để tìm hành trình phù hợp. Giá hiển thị là giá thấp nhất cho
          mỗi khách.
        </p>

        <div className="mt-8">
          <Suspense fallback={<TourListingSkeleton />}>
            <TourListing searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
