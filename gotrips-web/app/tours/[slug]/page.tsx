import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { TourDetail, TourDetailSkeleton } from "@/components/tour/TourDetail";
import { loadSection } from "@/lib/data/load-section";
import { getTourDetail } from "@/lib/data/tours";

// Không có `generateStaticParams` có chủ đích: danh sách slug nằm ở gotrips-api mà `next build` (nhất là build Docker) không
// có API để hỏi, và Cache Components bắt buộc trả ít nhất một slug nếu có hàm này. Không có nó thì `params` là dữ liệu theo
// yêu cầu: khung trang (Header, Footer, khung chờ) vẫn prerender, nội dung tour stream sau và được cache theo `cacheLife`
// của `getTourDetail`. Cùng khuôn với `/bookings/[code]`.
export async function generateMetadata({ params }: PageProps<"/tours/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // API lỗi thì dùng tiêu đề chung chứ không để cả trang hỏng vì thẻ <title> (nội dung trang tự báo lỗi riêng).
  const result = await loadSection("chi tiết tour", () => getTourDetail(slug));
  if (!result.ok) return { title: "Tour du lịch" };
  const tour = result.data;
  if (!tour) return { title: "Không tìm thấy tour" };

  return {
    title: tour.title,
    description: tour.shortDescription,
    openGraph: { title: tour.title, description: tour.shortDescription, images: [tour.coverImage] },
  };
}

/**
 * /tours/[slug] — chi tiết tour. Khung trang nằm trong App Shell dùng chung; phần phụ thuộc slug (`TourDetail`)
 * stream sau trong `<Suspense>`. Không `await params` ở đây, chỉ truyền Promise xuống (xem `TourDetail`).
 */
export default function TourDetailPage({ params }: PageProps<"/tours/[slug]">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Suspense fallback={<TourDetailSkeleton />}>
          <TourDetail params={params} />
        </Suspense>
      </Container>
    </div>
  );
}
