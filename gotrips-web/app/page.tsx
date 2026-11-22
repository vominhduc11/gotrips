import { FeaturedTours } from "@/components/home/FeaturedTours";
import { HeroSearch } from "@/components/home/HeroSearch";
import { NewsletterCta } from "@/components/home/NewsletterCta";
import { PopularDestinations } from "@/components/home/PopularDestinations";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyGoTrips } from "@/components/home/WhyGoTrips";

/** Trang chủ — chỉ ghép các section. Header/Footer nằm trong app/layout.tsx. */
export default function HomePage() {
  return (
    <>
      <HeroSearch />
      <PopularDestinations />
      <FeaturedTours />
      <WhyGoTrips />
      <Testimonials />
      <NewsletterCta />
    </>
  );
}
