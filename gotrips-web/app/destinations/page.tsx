import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { DestinationCard } from "@/components/destination/DestinationCard";
import { CardGridSkeleton } from "@/components/home/HomeSkeletons";
import { loadDestinations } from "@/lib/data/catalog-loaders";

export const metadata: Metadata = {
  title: "Điểm đến",
  description:
    "Các điểm đến du lịch trong nước trên GoTrips: chọn một điểm đến để xem các tour đang mở bán và ngày khởi hành còn chỗ.",
};

const GRID_CLASS = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3";

/**
 * /destinations — mọi điểm đến; bấm một thẻ mở `/tours?destination=<slug>`. Tiêu đề nằm trong static shell; danh sách lấy
 * từ gotrips-api nên stream sau `await io()` (xem `loadSection`) — nhờ vậy `next build` không cần gọi API.
 */
export default function DestinationsPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <PageHeader
          title="Điểm đến"
          description="Chọn một điểm đến để xem các tour đang mở bán và ngày khởi hành còn chỗ."
        />

        <Suspense fallback={<CardGridSkeleton count={6} className={GRID_CLASS} cardClassName="aspect-4/5 sm:aspect-4/3" />}>
          <DestinationList />
        </Suspense>
      </Container>
    </div>
  );
}

async function DestinationList() {
  const result = await loadDestinations();

  if (!result.ok) {
    return <SectionUnavailable what="danh sách điểm đến" className="mt-8 bg-surface-muted" />;
  }
  if (result.data.length === 0) {
    return (
      <p className="mt-8 rounded-card bg-surface-muted p-8 text-center text-ink-muted">
        Hiện chưa có điểm đến nào. Vui lòng quay lại sau.
      </p>
    );
  }

  return (
    <ul className={`mt-8 ${GRID_CLASS}`}>
      {result.data.map((destination) => (
        <li key={destination.id}>
          <DestinationCard destination={destination} />
        </li>
      ))}
    </ul>
  );
}
