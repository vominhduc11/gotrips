import { ArrowRight } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { HotelCard } from "@/components/hotel/HotelCard";
import { getFeaturedHotels } from "@/lib/data/hotels";
import { loadSection } from "@/lib/data/load-section";
import { CardGridSkeleton } from "./HomeSkeletons";

const GRID_CLASS = "grid gap-5 sm:grid-cols-2 lg:grid-cols-4";

function FeaturedHotelsFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="khach-san-noi-bat-heading" className="py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="khach-san-noi-bat-heading"
          eyebrow="Nghỉ ngơi trọn vẹn"
          title="Khách sạn nổi bật"
          description="Những nơi lưu trú được khách chấm điểm cao ở các điểm đến được yêu thích. Xem loại phòng và đặt ngay."
        />

        {children}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="lg">
            <AppLink href="/hotels">
              Xem tất cả khách sạn
              <ArrowRight aria-hidden="true" className="size-5" />
            </AppLink>
          </Button>
        </div>
      </Container>
    </section>
  );
}

/**
 * Section "Khách sạn nổi bật" (dữ liệu từ gotrips-api: bỏ khách sạn HIDDEN và khách sạn chưa có loại phòng, "giá từ" là
 * giá một đêm thấp nhất). Bấm thẻ mở trang chi tiết khách sạn (chọn phòng, ngày và đặt phòng); "Xem tất cả" dẫn tới `/hotels`.
 * Nền trắng: nằm giữa "Tour nổi bật" (`bg-surface-muted`) và "Chặng bay phổ biến" (`bg-surface-muted`) nên hai section
 * liền kề luôn khác màu nền.
 *
 * API lỗi: ẨN cả section (đây là phần phụ, không để nhiều khối báo lỗi liền nhau trên Trang chủ). Khi đó có thể có hai
 * section liền kề cùng màu nền — chấp nhận trong lúc đang lỗi.
 */
export function FeaturedHotels() {
  return (
    <Suspense
      fallback={
        <FeaturedHotelsFrame>
          <CardGridSkeleton count={4} className={GRID_CLASS} cardClassName="h-96" />
        </FeaturedHotelsFrame>
      }
    >
      <FeaturedHotelsList />
    </Suspense>
  );
}

async function FeaturedHotelsList() {
  const result = await loadSection("khách sạn nổi bật", () => getFeaturedHotels());
  if (!result.ok) return null;

  return (
    <FeaturedHotelsFrame>
      {result.data.length > 0 ? (
        <ul className={`mt-8 ${GRID_CLASS}`}>
          {result.data.map((hotel) => (
            <li key={hotel.id}>
              <HotelCard hotel={hotel} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
          Hiện chưa có khách sạn nào để gợi ý. Vui lòng quay lại sau.
        </p>
      )}
    </FeaturedHotelsFrame>
  );
}
