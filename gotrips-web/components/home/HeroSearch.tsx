import { Suspense } from "react";
import { Container } from "@/components/common/Container";
import { CoverImage } from "@/components/common/CoverImage";
import { getHeroBanner } from "@/lib/data/home";
import { HeroGreeting, HeroGreetingFallback } from "./HeroGreeting";
import { FlightSearchSlot, HotelSearchSlot, TourSearchSlot } from "./SearchPanels";
import { ServiceTabs } from "./ServiceTabs";
import { SERVICE_TAB_HASH, SERVICE_TABS } from "./service-tab-hash";

/**
 * Hero: ảnh nền + tiêu đề `h1` duy nhất của trang + ô tìm kiếm (3 tab: Tour, Khách sạn, Vé máy bay).
 * Ảnh nền, `h1`, thanh tab và các điểm cuộn là tĩnh (static shell). Ba form cần dữ liệu từ API nên stream vào từng panel
 * (xem `SearchPanels.tsx`): API lỗi thì chỉ form bị ảnh hưởng, Hero vẫn đầy đủ.
 */
export async function HeroSearch() {
  const banner = await getHeroBanner();

  return (
    <section aria-labelledby="hero-heading" className="relative isolate">
      {/* Ảnh LCP → preload. Gradient `tone="dark"` là nền dự phòng nếu ảnh lỗi. */}
      <CoverImage src={banner.imageUrl} alt={banner.imageAlt} sizes="100vw" preload tone="dark" />
      {/* Lớp phủ tối để chữ trắng luôn đạt tương phản AA trên mọi vùng ảnh. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-primary-950/75 via-primary-950/55 to-primary-950/80"
      />

      <Container className="relative py-12 sm:py-20 lg:py-24">
        <div className="max-w-2xl text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-200">
            <Suspense fallback={<HeroGreetingFallback />}>
              <HeroGreeting />
            </Suspense>
          </p>
          <h1
            id="hero-heading"
            className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
          >
            Khám phá Việt Nam, đặt tour chỉ trong vài phút
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-100 sm:text-lg">
            Chọn điểm đến, ngày khởi hành còn chỗ và đặt tour ngay với mức giá rõ ràng từ đầu — không phụ thu
            bất ngờ.
          </p>
        </div>

        <div className="mt-8 rounded-card bg-surface text-ink shadow-search sm:mt-10">
          {/*
            Đích cuộn của các liên kết `/#tim-tour`, `/#tim-khach-san`, `/#tim-ve-may-bay` (thẻ ở thân Trang chủ,
            hoặc mở thẳng đường dẫn có hash).
            Next và trình duyệt cuộn tới phần tử có `id` BẰNG hash; nếu không có thì Next coi như đã xử lý và
            không cuộn gì cả. Vì mỗi tab có một hash riêng nên cần đủ ba điểm ở đầu ô tìm kiếm, chiều cao 0, không
            ảnh hưởng bố cục. Đặt ở đây (không đặt trên panel của tab) vì panel tab không chọn bị `display: none`.
            `scroll-mt-20` = chiều cao header dính (h-16) + 1rem hở, để header không che mép trên của ô tìm kiếm.
          */}
          {SERVICE_TABS.map((tab) => (
            <span key={tab} id={SERVICE_TAB_HASH[tab]} className="block h-0 scroll-mt-20" />
          ))}
          <ServiceTabs tourForm={<TourSearchSlot />} hotelForm={<HotelSearchSlot />} flightForm={<FlightSearchSlot />} />
        </div>
      </Container>
    </section>
  );
}
