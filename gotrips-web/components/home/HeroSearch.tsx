import { Container } from "@/components/ui/Container";
import { CoverImage } from "@/components/ui/CoverImage";
import { getHeroBanner, getPopularDestinations } from "@/lib/data/home";
import { SearchForm } from "./SearchForm";
import { ServiceTabs } from "./ServiceTabs";

/** Hero: ảnh nền + tiêu đề `h1` duy nhất của trang + ô tìm kiếm. */
export async function HeroSearch() {
  const [banner, destinations] = await Promise.all([getHeroBanner(), getPopularDestinations()]);

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
            Đặt tour du lịch trực tuyến
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
          <ServiceTabs />
          <div className="p-4 sm:p-6">
            <SearchForm
              destinations={destinations.map(({ slug, name, region }) => ({ slug, name, region }))}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
