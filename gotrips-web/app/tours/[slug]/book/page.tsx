import type { Metadata } from "next";
import { Suspense } from "react";
import { BookTourContent, BookTourSkeleton } from "@/components/booking/BookTourContent";
import { Container } from "@/components/common/Container";
import { loadSection } from "@/lib/data/load-section";
import { getTourDetail } from "@/lib/data/tours";

// Như trang chi tiết: không có `generateStaticParams` (danh sách tour nằm ở gotrips-api, build không gọi được API) nên khung
// trang prerender còn phần phụ thuộc slug stream sau trong Suspense.
export async function generateMetadata({ params }: PageProps<"/tours/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadSection("chi tiết tour", () => getTourDetail(slug));
  const tour = result.ok ? result.data : null;
  return {
    title: tour ? `Đặt tour ${tour.title}` : result.ok ? "Không tìm thấy tour" : "Đặt tour",
    // Trang thao tác theo từng khách, không có nội dung cho công cụ tìm kiếm.
    robots: { index: false },
  };
}

/** Không `await params` ở đây, chỉ truyền Promise xuống `BookTourContent` trong `<Suspense>`. */
export default function BookTourPage({ params, searchParams }: PageProps<"/tours/[slug]/book">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Suspense fallback={<BookTourSkeleton />}>
          <BookTourContent params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}
