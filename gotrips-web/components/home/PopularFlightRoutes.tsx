import { ArrowRight } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { FlightRouteCard } from "@/components/flight/FlightRouteCard";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { getPopularFlightRoutes } from "@/lib/data/flight-routes";
import { loadSection } from "@/lib/data/load-section";
import { CardGridSkeleton } from "./HomeSkeletons";

const GRID_CLASS = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

function PopularFlightRoutesFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="chang-bay-pho-bien-heading" className="bg-surface-muted py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="chang-bay-pho-bien-heading"
          eyebrow="Bay khắp Việt Nam"
          title="Chặng bay phổ biến"
          description="Bấm một thẻ để điền sẵn điểm đi và điểm đến vào ô tìm kiếm Vé máy bay ở đầu trang, rồi chọn ngày bay. Giá chỉ để tham khảo."
        />

        {children}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="lg">
            <AppLink href="/flights">
              Xem tất cả chặng bay
              <ArrowRight aria-hidden="true" className="size-5" />
            </AppLink>
          </Button>
        </div>
      </Container>
    </section>
  );
}

/**
 * Section "Chặng bay phổ biến" (dữ liệu từ gotrips-api, theo độ phổ biến, kèm sân bay hai đầu). Bấm thẻ điền sẵn điểm
 * đi/đến vào tab Vé máy bay của ô tìm kiếm Trang chủ (khách chọn tiếp ngày bay rồi tìm); "Xem tất cả" dẫn tới `/flights`.
 * Giá trên thẻ chỉ là giá tham khảo.
 * Nền `bg-surface-muted`: nằm sau "Khách sạn nổi bật" (nền trắng) và trước "Vì sao chọn GoTrips" (nền trắng).
 *
 * API lỗi: ẨN cả section (phần phụ; xem ghi chú ở `FeaturedHotels`).
 */
export function PopularFlightRoutes() {
  return (
    <Suspense
      fallback={
        <PopularFlightRoutesFrame>
          <CardGridSkeleton count={3} className={GRID_CLASS} cardClassName="h-80" />
        </PopularFlightRoutesFrame>
      }
    >
      <PopularFlightRoutesList />
    </Suspense>
  );
}

async function PopularFlightRoutesList() {
  const result = await loadSection("chặng bay phổ biến", () => getPopularFlightRoutes());
  if (!result.ok) return null;

  return (
    <PopularFlightRoutesFrame>
      {result.data.length > 0 ? (
        <ul className={`mt-8 ${GRID_CLASS}`}>
          {result.data.map((route) => (
            <li key={route.id}>
              <FlightRouteCard route={route} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-card bg-surface p-8 text-center text-ink-muted shadow-card">
          Hiện chưa có chặng bay nào để gợi ý. Vui lòng quay lại sau.
        </p>
      )}
    </PopularFlightRoutesFrame>
  );
}
