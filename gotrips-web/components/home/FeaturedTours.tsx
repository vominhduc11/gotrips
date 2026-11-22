import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowRightIcon } from "@/components/ui/icons";
import { TourCard } from "@/components/tour/TourCard";
import { getFeaturedTours } from "@/lib/data/home";

export async function FeaturedTours() {
  const tours = await getFeaturedTours();

  return (
    <section id="tour-noi-bat" aria-labelledby="tour-noi-bat-heading" className="scroll-mt-20 bg-surface-muted py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="tour-noi-bat-heading"
          eyebrow="Gợi ý cho bạn"
          title="Tour nổi bật"
          description="Những hành trình được tuyển chọn, còn chỗ trong thời gian tới. Giá hiển thị là giá thấp nhất cho mỗi khách."
        />

        {tours.length > 0 ? (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tours.map((tour) => (
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

        <div className="mt-10 text-center">
          <ButtonLink href="/tours" variant="outline" size="lg">
            Xem tất cả tour
            <ArrowRightIcon className="size-5" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
