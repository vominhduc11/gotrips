import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Compass, MapPin, Star } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { CoverImage } from "@/components/common/CoverImage";
import { StarRating } from "@/components/common/StarRating";
import { DepartureList } from "@/components/tour/DepartureList";
import { TourPriceCard } from "@/components/tour/TourPriceCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getTourDetail, getTourSlugs } from "@/lib/data/tours";
import { formatDuration, formatRating } from "@/lib/format";

// Biết trước danh sách slug nên trang được prerender lúc build; slug lạ vẫn render theo yêu cầu rồi `notFound()`.
export async function generateStaticParams() {
  return (await getTourSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/tours/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourDetail(slug);
  if (!tour) return { title: "Không tìm thấy tour" };

  return {
    title: tour.title,
    description: tour.shortDescription,
    openGraph: { title: tour.title, description: tour.shortDescription, images: [tour.coverImage] },
  };
}

export default async function TourDetailPage({ params }: PageProps<"/tours/[slug]">) {
  const { slug } = await params;
  const tour = await getTourDetail(slug);
  if (!tour) notFound();

  // Dữ liệu có cấu trúc cho công cụ tìm kiếm. Thay `<` để chuỗi từ dữ liệu không thể đóng thẻ <script> (XSS).
  const prices = tour.departures.filter((d) => !d.isSoldOut).map((d) => d.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: tour.title,
    description: tour.shortDescription,
    image: tour.coverImage,
    ...(prices.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "VND",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <div className="py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Container>
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <AppLink href="/">Trang chủ</AppLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <AppLink href="/tours">Tour du lịch</AppLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <AppLink href={`/tours?destination=${tour.destinationSlug}`}>{tour.destinationName}</AppLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tour.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
          <MapPin aria-hidden="true" className="size-4" />
          {tour.destinationName}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{tour.title}</h1>
        <p className="mt-3 flex items-center gap-1.5 text-ink-muted">
          <Star aria-hidden="true" fill="currentColor" stroke="none" className="size-5 text-star" />
          <span className="font-semibold text-ink">{formatRating(tour.rating)}</span>
          <span>({tour.reviewCount.toLocaleString("vi-VN")} đánh giá)</span>
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="min-w-0 space-y-10">
            <div className="relative aspect-16/9 overflow-hidden rounded-card shadow-card">
              <CoverImage
                src={tour.coverImage}
                alt={tour.coverImageAlt}
                sizes="(min-width: 1280px) 800px, (min-width: 1024px) 60vw, 100vw"
                preload
              />
            </div>

            <section aria-labelledby="gioi-thieu-heading">
              <h2 id="gioi-thieu-heading" className="text-2xl font-bold text-ink">
                Giới thiệu
              </h2>
              <p className="mt-3 text-base leading-7 text-ink">{tour.shortDescription}</p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-card bg-surface-muted p-4">
                  <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" />
                  <div>
                    <dt className="text-sm text-ink-muted">Thời gian</dt>
                    <dd className="font-semibold text-ink">
                      {tour.durationDays} ngày {tour.durationNights} đêm{" "}
                      <span aria-hidden="true" className="font-normal text-ink-muted">
                        ({formatDuration(tour.durationDays, tour.durationNights)})
                      </span>
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-card bg-surface-muted p-4">
                  <Compass aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" />
                  <div>
                    <dt className="text-sm text-ink-muted">Khởi hành từ</dt>
                    <dd className="font-semibold text-ink">{tour.departureCity}</dd>
                  </div>
                </div>
              </dl>
            </section>

            <section aria-labelledby="lich-khoi-hanh-heading">
              <h2 id="lich-khoi-hanh-heading" className="text-2xl font-bold text-ink">
                Lịch khởi hành
              </h2>
              <div className="mt-4">
                <DepartureList departures={tour.departures} />
              </div>
            </section>

            {tour.testimonials.length > 0 ? (
              <section aria-labelledby="danh-gia-heading">
                <h2 id="danh-gia-heading" className="text-2xl font-bold text-ink">
                  Khách hàng nói gì
                </h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {tour.testimonials.map((testimonial) => (
                    <li key={testimonial.id}>
                      <figure className="h-full rounded-card bg-surface p-5 shadow-card">
                        <StarRating rating={testimonial.rating} />
                        <blockquote className="mt-3 text-base leading-7 text-ink">
                          <p>“{testimonial.content}”</p>
                        </blockquote>
                        <figcaption className="mt-4 border-t border-line pt-3 text-sm">
                          <span className="block font-semibold text-ink">{testimonial.customerName}</span>
                          <span className="block text-ink-muted">{testimonial.customerCity}</span>
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <TourPriceCard tour={tour} />
        </div>
      </Container>
    </div>
  );
}
