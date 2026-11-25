import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { HotelDetail, HotelDetailSkeleton } from "@/components/hotel/HotelDetail";
import { getHotelDetail } from "@/lib/data/hotels";
import { loadSection } from "@/lib/data/load-section";

// Không có `generateStaticParams` có chủ đích: danh sách slug nằm ở gotrips-api mà `next build` (nhất là build Docker) không
// có API để hỏi, và Cache Components bắt buộc trả ít nhất một slug nếu có hàm này. Không có nó thì `params` là dữ liệu theo
// yêu cầu: khung trang (Header, Footer, khung chờ) vẫn prerender, nội dung khách sạn stream sau và được cache theo
// `cacheLife` của `getHotelDetail`. Cùng khuôn với `/tours/[slug]`.
export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  // API lỗi thì dùng tiêu đề chung chứ không để cả trang hỏng vì thẻ <title> (nội dung trang tự báo lỗi riêng).
  const result = await loadSection("chi tiết khách sạn", () => getHotelDetail(slug));
  if (!result.ok) return { title: "Khách sạn" };
  const hotel = result.data;
  if (!hotel) return { title: "Không tìm thấy khách sạn" };

  return {
    title: hotel.name,
    description: hotel.description,
    openGraph: { title: hotel.name, description: hotel.description, images: [hotel.imageUrl] },
  };
}

/**
 * /hotels/[slug] — chi tiết khách sạn. Khung trang nằm trong App Shell dùng chung; phần phụ thuộc slug (`HotelDetail`)
 * stream sau trong `<Suspense>`. Không `await params` ở đây, chỉ truyền Promise xuống (xem `HotelDetail`).
 */
export default function HotelDetailPage({ params }: PageProps<"/hotels/[slug]">) {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Suspense fallback={<HotelDetailSkeleton />}>
          <HotelDetail params={params} />
        </Suspense>
      </Container>
    </div>
  );
}
