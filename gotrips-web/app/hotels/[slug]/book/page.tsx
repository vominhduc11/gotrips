import type { Metadata } from "next";
import { Suspense } from "react";
import { BookHotelContent, BookHotelSkeleton } from "@/components/booking/BookHotelContent";
import { Container } from "@/components/common/Container";
import { getHotelDetail } from "@/lib/data/hotels";
import { loadSection } from "@/lib/data/load-section";

// Như trang chi tiết: không có `generateStaticParams` (danh sách khách sạn nằm ở gotrips-api, build không gọi được API) nên
// khung trang prerender còn phần phụ thuộc slug stream sau trong Suspense.
export async function generateMetadata({ params }: PageProps<"/hotels/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadSection("chi tiết khách sạn", () => getHotelDetail(slug));
  const hotel = result.ok ? result.data : null;
  return {
    title: hotel ? `Đặt phòng ${hotel.name}` : result.ok ? "Không tìm thấy khách sạn" : "Đặt phòng",
    // Trang thao tác theo từng khách, không có nội dung cho công cụ tìm kiếm.
    robots: { index: false },
  };
}

/** Không `await params` ở đây, chỉ truyền Promise xuống `BookHotelContent` trong `<Suspense>`. */
export default function BookHotelPage({ params, searchParams }: PageProps<"/hotels/[slug]/book">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Suspense fallback={<BookHotelSkeleton />}>
          <BookHotelContent params={params} searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}
