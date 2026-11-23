import { FeaturedHotels } from "@/components/home/FeaturedHotels";
import { FeaturedTours } from "@/components/home/FeaturedTours";
import { HeroSearch } from "@/components/home/HeroSearch";
import { NewsletterCta } from "@/components/home/NewsletterCta";
import { PopularDestinations } from "@/components/home/PopularDestinations";
import { PopularFlightRoutes } from "@/components/home/PopularFlightRoutes";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyGoTrips } from "@/components/home/WhyGoTrips";

/**
 * Trang chủ — chỉ ghép các section. Header/Footer nằm trong app/layout.tsx.
 * Nền các section xen kẽ để hai section liền nhau không cùng màu: trắng (Điểm đến) → muted (Tour) → trắng (Khách sạn)
 * → muted (Chặng bay) → trắng (Vì sao) → primary-50 (Đánh giá) → trắng (Ưu đãi). Thêm/đổi thứ tự phải giữ quy tắc này.
 */
export default function HomePage() {
  return (
    <>
      <HeroSearch />
      <PopularDestinations />
      <FeaturedTours />
      <FeaturedHotels />
      <PopularFlightRoutes />
      <WhyGoTrips />
      <Testimonials />
      <NewsletterCta />
    </>
  );
}
