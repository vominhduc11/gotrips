import { Suspense } from "react";
import { AppLink } from "@/components/common/AppLink";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { Button } from "@/components/ui/button";
import { loadAirports, loadDestinations } from "@/lib/data/catalog-loaders";
import { FlightSearchForm } from "./FlightSearchForm";
import { HotelSearchForm } from "./HotelSearchForm";
import { SearchFormSkeleton } from "./HomeSkeletons";
import { SearchForm } from "./SearchForm";

/**
 * Ba form của ô tìm kiếm Hero. Mỗi form cần danh sách từ API (điểm đến cho Tour/Khách sạn, sân bay cho Vé máy bay), nên
 * mỗi form có `<Suspense>` riêng: thanh tab (`ServiceTabs`) và các điểm cuộn `#tim-*` luôn nằm trong static shell,
 * còn form stream vào panel của nó sau `await io()`. Lỗi API ở một danh sách chỉ làm hỏng form dùng danh sách đó, các
 * tab còn lại vẫn dùng bình thường — và khách vẫn đi tiếp được qua liên kết tới trang `/tours`, `/hotels`, `/flights`.
 */

function SearchUnavailable({ what, href, linkLabel }: { what: string; href: string; linkLabel: string }) {
  return (
    <div className="space-y-4 rounded-control bg-surface-muted p-6 text-center">
      <SectionUnavailable what={what} className="p-0" />
      <Button asChild variant="outline" size="md">
        <AppLink href={href}>{linkLabel}</AppLink>
      </Button>
    </div>
  );
}

async function TourSearchPanel() {
  const result = await loadDestinations();
  if (!result.ok) {
    return <SearchUnavailable what="ô tìm tour" href="/tours" linkLabel="Xem danh sách tour" />;
  }
  // Chỉ truyền xuống client những trường form cần, không đẩy cả object điểm đến (ảnh, số tour...) vào payload.
  return <SearchForm destinations={result.data.map(({ slug, name, region }) => ({ slug, name, region }))} />;
}

async function HotelSearchPanel() {
  const result = await loadDestinations();
  if (!result.ok) {
    return <SearchUnavailable what="ô tìm khách sạn" href="/hotels" linkLabel="Xem khách sạn" />;
  }
  return <HotelSearchForm destinations={result.data.map(({ slug, name, region }) => ({ slug, name, region }))} />;
}

async function FlightSearchPanel() {
  const result = await loadAirports();
  if (!result.ok) {
    return <SearchUnavailable what="ô tìm vé máy bay" href="/flights" linkLabel="Xem chặng bay" />;
  }
  return <FlightSearchForm airports={result.data} />;
}

export function TourSearchSlot() {
  return (
    <Suspense fallback={<SearchFormSkeleton />}>
      <TourSearchPanel />
    </Suspense>
  );
}

export function HotelSearchSlot() {
  return (
    <Suspense fallback={<SearchFormSkeleton />}>
      <HotelSearchPanel />
    </Suspense>
  );
}

export function FlightSearchSlot() {
  return (
    <Suspense fallback={<SearchFormSkeleton fieldCount={5} />}>
      <FlightSearchPanel />
    </Suspense>
  );
}
