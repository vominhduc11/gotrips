import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { TourDetail, TourDetailSkeleton } from "@/components/tour/TourDetail";
import { getTourDetail, getTourSlugs } from "@/lib/data/tours";

// Biết trước danh sách slug nên trang được prerender lúc build; slug lạ vẫn render theo yêu cầu rồi `notFound()`.
export async function generateStaticParams() {
  return (await getTourSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/tours/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourDetail(slug);
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
