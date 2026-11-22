import { AppLink } from "@/components/ui/AppLink";
import { Container } from "@/components/ui/Container";
import { CoverImage } from "@/components/ui/CoverImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPopularDestinations } from "@/lib/data/home";

export async function PopularDestinations() {
  const destinations = await getPopularDestinations();

  return (
    // id="diem-den": đích của menu "Điểm đến"; scroll-mt chừa chỗ cho header dính.
    <section id="diem-den" aria-labelledby="diem-den-heading" className="scroll-mt-20 py-14 sm:py-20">
      <Container>
        <SectionHeading
          id="diem-den-heading"
          eyebrow="Khám phá"
          title="Điểm đến phổ biến"
          description="Chọn một điểm đến để xem các tour đang mở bán và ngày khởi hành còn chỗ."
        />

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <AppLink
                href={`/tours?destination=${destination.slug}`}
                className="group relative block aspect-4/5 overflow-hidden rounded-card shadow-card transition-shadow hover:shadow-card-hover sm:aspect-4/3"
              >
                <CoverImage
                  src={destination.imageUrl}
                  alt={destination.imageAlt}
                  sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 50vw"
                  imageClassName="transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-linear-to-t from-neutral-950/80 via-neutral-950/15 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <span className="block text-xs font-medium uppercase tracking-wide text-neutral-100">
                    {destination.region}
                  </span>
                  <span className="mt-0.5 block text-lg font-bold sm:text-xl">{destination.name}</span>
                  <span className="mt-0.5 block text-sm text-neutral-100">
                    {destination.tourCount > 0 ? `${destination.tourCount} tour` : "Sắp có tour"}
                  </span>
                </div>
              </AppLink>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
