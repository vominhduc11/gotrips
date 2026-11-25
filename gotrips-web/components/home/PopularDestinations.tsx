import { ArrowRight } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { DestinationCard } from "@/components/destination/DestinationCard";
import { Button } from "@/components/ui/button";
import { loadDestinations } from "@/lib/data/catalog-loaders";
import { CardGridSkeleton } from "./HomeSkeletons";

const GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3";

/** Khung section (tiêu đề + nút "Xem tất cả" luôn có; phần thân là dữ liệu từ API nên thay đổi theo trạng thái). */
function PopularDestinationsFrame({ children }: { children: ReactNode }) {
  return (
    // id="diem-den": giữ để liên kết cũ `/#diem-den` vẫn cuộn tới đây; scroll-mt chừa chỗ cho header dính.
    <section id="diem-den" aria-labelledby="diem-den-heading" className="scroll-mt-20 py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="diem-den-heading"
          eyebrow="Khám phá"
          title="Điểm đến phổ biến"
          description="Chọn một điểm đến để xem các tour đang mở bán và ngày khởi hành còn chỗ."
        />

        {children}

        <div className="mt-10 text-center">
          <Button asChild variant="outline" size="lg">
            <AppLink href="/destinations">
              Xem tất cả điểm đến
              <ArrowRight aria-hidden="true" className="size-5" />
            </AppLink>
          </Button>
        </div>
      </Container>
    </section>
  );
}

/**
 * Section "Điểm đến phổ biến" (dữ liệu từ gotrips-api). Tiêu đề nằm trong static shell, danh sách stream sau `await io()`
 * (xem `loadSection`). Lỗi API: giữ khung section và hiện thông báo thay cho danh sách.
 */
export function PopularDestinations() {
  return (
    <Suspense
      fallback={
        <PopularDestinationsFrame>
          <CardGridSkeleton count={6} className={GRID_CLASS} cardClassName="aspect-4/5 sm:aspect-4/3" />
        </PopularDestinationsFrame>
      }
    >
      <PopularDestinationsList />
    </Suspense>
  );
}

async function PopularDestinationsList() {
  const result = await loadDestinations();

  return (
    <PopularDestinationsFrame>
      {!result.ok ? (
        <SectionUnavailable what="danh sách điểm đến" className="mt-8 bg-surface-muted" />
      ) : result.data.length > 0 ? (
        <ul className={`mt-8 ${GRID_CLASS}`}>
          {result.data.map((destination) => (
            <li key={destination.id}>
              <DestinationCard destination={destination} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
          Hiện chưa có điểm đến nào. Vui lòng quay lại sau.
        </p>
      )}
    </PopularDestinationsFrame>
  );
}
