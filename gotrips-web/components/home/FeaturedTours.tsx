import { ArrowRight } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { TourCard } from "@/components/tour/TourCard";
import { Button } from "@/components/ui/button";
import { getFeaturedTours } from "@/lib/data/home";
import { loadSection } from "@/lib/data/load-section";
import { CardGridSkeleton } from "./HomeSkeletons";

const GRID_CLASS = "grid gap-5 sm:grid-cols-2 lg:grid-cols-4";

/** Khung section (tiêu đề + nút "Xem tất cả tour" luôn có; phần thân là dữ liệu từ API nên thay đổi theo trạng thái). */
function FeaturedToursFrame({ children }: { children: ReactNode }) {
  return (
    <section id="tour-noi-bat" aria-labelledby="tour-noi-bat-heading" className="scroll-mt-20 bg-surface-muted py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="tour-noi-bat-heading"
          eyebrow="Gợi ý cho bạn"
          title="Tour nổi bật"
          description="Những hành trình được tuyển chọn, còn chỗ trong thời gian tới. Giá hiển thị là giá thấp nhất cho mỗi khách."
        />

        {children}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="lg"><AppLink href="/tours">
            Xem tất cả tour
            <ArrowRight aria-hidden="true" className="size-5" />
          </AppLink></Button>
        </div>
      </Container>
    </section>
  );
}

/**
 * Section "Tour nổi bật" (dữ liệu từ gotrips-api: chỉ tour nổi bật còn ít nhất một chuyến đặt được, giá từ/ngày/số chỗ
 * do API tính sẵn). Tiêu đề trong static shell, danh sách stream sau `await io()`. Đây là section cốt lõi của Trang
 * chủ nên khi API lỗi vẫn giữ khung + thông báo (không ẩn), nút "Xem tất cả tour" vẫn dùng được.
 */
export function FeaturedTours() {
  return (
    <Suspense
      fallback={
        <FeaturedToursFrame>
          <CardGridSkeleton count={4} className={GRID_CLASS} cardClassName="h-96" />
        </FeaturedToursFrame>
      }
    >
      <FeaturedToursList />
    </Suspense>
  );
}

async function FeaturedToursList() {
  const result = await loadSection("tour nổi bật", () => getFeaturedTours());

  return (
    <FeaturedToursFrame>
      {!result.ok ? (
        <SectionUnavailable what="danh sách tour nổi bật" className="mt-8 bg-surface shadow-card" />
      ) : result.data.length > 0 ? (
        <ul className={`mt-8 ${GRID_CLASS}`}>
          {result.data.map((tour) => (
            <li key={tour.id}>
              <TourCard tour={tour} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-card bg-surface p-8 text-center text-ink-muted shadow-card">
          Hiện chưa có tour nào còn chỗ. Vui lòng quay lại sau.
        </p>
      )}
    </FeaturedToursFrame>
  );
}
