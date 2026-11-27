import { BedDouble, Clock, MapPin, Maximize2, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { createElement } from "react";
import { AppLink } from "@/components/common/AppLink";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { StarRating } from "@/components/common/StarRating";
import { getAmenityIcon } from "@/components/hotel/amenity-icons";
import { HotelBookingCard } from "@/components/hotel/HotelBookingCard";
import { HotelBookingProvider } from "@/components/hotel/HotelBookingProvider";
import { PhotoCarousel } from "@/components/hotel/PhotoCarousel";
import { SelectRoomButton } from "@/components/hotel/SelectRoomButton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { toRoomTypeView } from "@/lib/data/hotel-view";
import { getHotelDetail } from "@/lib/data/hotels";
import { loadSection } from "@/lib/data/load-section";
import { formatRating, formatVND } from "@/lib/format";

/**
 * Phần phụ thuộc URL của trang /hotels/[slug]: chi tiết khách sạn, bộ ảnh, giới thiệu, tiện ích, giờ nhận/trả phòng,
 * các loại phòng (kèm ảnh và tiện ích) và thẻ "Đặt phòng". `params` chỉ được `await` ở đây (bên trong `<Suspense>` của page): slug không còn biết trước
 * lúc build (không có `generateStaticParams`, vì danh sách khách sạn nằm ở gotrips-api mà build không gọi được), nên đọc
 * `params` ở cấp trên cùng sẽ buộc cả App Shell vào một slug (Next báo "URL data outside of Suspense"). Page chỉ truyền
 * Promise xuống, không `await`.
 *
 * Lựa chọn (phòng, ngày, khách, số phòng) đọc/ghi URL phía client (`HotelBookingProvider`).
 */
export async function HotelDetail({ params }: Pick<PageProps<"/hotels/[slug]">, "params">) {
  const { slug } = await params;
  // `loadSection`: API lỗi thì hiện thông báo cục bộ (kèm log) thay vì trang lỗi chung của Next; slug không có/ẩn thì 404.
  const detail = await loadSection("chi tiết khách sạn", () => getHotelDetail(slug));
  if (!detail.ok) return <SectionUnavailable what="thông tin khách sạn" className="bg-surface shadow-card" />;
  const hotel = detail.data;
  if (!hotel) notFound();

  // Bộ ảnh đầu trang: ảnh đại diện (cũng là ảnh trên thẻ) đứng đầu, rồi các ảnh xem thêm (có thể không có ảnh nào).
  const photos = [{ url: hotel.imageUrl, alt: hotel.imageAlt }, ...hotel.images];

  // Dữ liệu có cấu trúc cho công cụ tìm kiếm. Thay `<` để chuỗi từ dữ liệu không thể đóng thẻ <script> (XSS).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.description,
    image: photos.map((photo) => photo.url),
    amenityFeature: hotel.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity.name,
      value: true,
    })),
    address: { "@type": "PostalAddress", streetAddress: hotel.area, addressCountry: "VN" },
    starRating: { "@type": "Rating", ratingValue: hotel.starRating },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: hotel.rating,
      reviewCount: hotel.reviewCount,
      bestRating: 5,
    },
    checkinTime: hotel.checkInTime,
    checkoutTime: hotel.checkOutTime,
    priceRange: `Từ ${formatVND(hotel.minPricePerNight)} / đêm`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
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
              <AppLink href="/hotels">Khách sạn</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{hotel.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <p className="flex items-center gap-1.5 text-sm font-semibold text-primary-800">
        <MapPin aria-hidden="true" className="size-4" />
        {hotel.area}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{hotel.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <StarRating rating={hotel.starRating} label={`Khách sạn ${hotel.starRating} sao`} />
        <p className="flex items-center gap-1.5 text-ink-muted">
          <Star aria-hidden="true" fill="currentColor" stroke="none" className="size-5 text-star" />
          <span className="font-semibold text-ink">{formatRating(hotel.rating)}</span>
          <span>({hotel.reviewCount.toLocaleString("vi-VN")} đánh giá)</span>
        </p>
      </div>

      {/* Provider (client) bọc cả cột nội dung lẫn thẻ "Đặt phòng": nút "Chọn phòng này" đổi lựa chọn trong thẻ.
          Phần nội dung truyền vào dạng children nên vẫn là Server Component. */}
      <HotelBookingProvider roomTypes={hotel.roomTypes.map(toRoomTypeView)}>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="min-w-0 space-y-10">
            <PhotoCarousel
              images={photos}
              label={`Ảnh ${hotel.name}`}
              sizes="(min-width: 1280px) 800px, (min-width: 1024px) 60vw, 100vw"
              aspectClassName="aspect-16/9"
              preload
              className="rounded-card shadow-card"
            />

            <section aria-labelledby="gioi-thieu-heading">
              <h2 id="gioi-thieu-heading" className="text-2xl font-bold text-ink">
                Giới thiệu
              </h2>
              <p className="mt-3 text-base leading-7 text-ink">{hotel.description}</p>
              <div className="mt-5 flex items-start gap-3 rounded-card bg-surface-muted p-4">
                <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-700" />
                <p className="text-ink">
                  Nhận phòng từ <strong className="font-semibold">{hotel.checkInTime}</strong>, trả phòng trước{" "}
                  <strong className="font-semibold">{hotel.checkOutTime}</strong>
                </p>
              </div>
              {hotel.amenities.length > 0 ? (
                <>
                  <h3 id="tien-ich-heading" className="mt-6 text-lg font-bold text-ink">
                    Tiện ích nổi bật
                  </h3>
                  <ul aria-labelledby="tien-ich-heading" className="mt-3 grid gap-3 sm:grid-cols-2">
                    {hotel.amenities.map((amenity) => (
                      <li key={amenity.code} className="flex items-center gap-2.5 text-ink">
                        <AmenityIcon code={amenity.code} className="size-5 shrink-0 text-primary-700" />
                        {amenity.name}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <section aria-labelledby="loai-phong-heading">
              <h2 id="loai-phong-heading" className="text-2xl font-bold text-ink">
                Loại phòng
              </h2>
              <p className="mt-2 text-sm text-ink-muted">Giá cho một phòng mỗi đêm, đã gồm thuế phí.</p>
              <ul className="mt-4 space-y-3">
                {hotel.roomTypes.map((room) => (
                  <li
                    key={room.id}
                    className="flex flex-col overflow-hidden rounded-card border border-line bg-surface sm:flex-row"
                  >
                    {/* Loại phòng chưa có ảnh thì bỏ hẳn cột ảnh, phần chữ chiếm trọn thẻ. */}
                    {room.images.length > 0 ? (
                      <div className="sm:w-56 sm:shrink-0 sm:p-3 sm:pr-0">
                        <PhotoCarousel
                          images={room.images}
                          label={`Ảnh ${room.name}`}
                          sizes="(min-width: 640px) 224px, 100vw"
                          aspectClassName="aspect-4/3"
                          className="sm:rounded-control"
                        />
                      </div>
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                      <div>
                        <h3 className="font-bold text-ink">{room.name}</h3>
                        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                          <li className="flex items-center gap-1.5">
                            <BedDouble aria-hidden="true" className="size-4" />
                            {room.bedType}
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Maximize2 aria-hidden="true" className="size-4" />
                            {room.areaM2} m²
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Users aria-hidden="true" className="size-4" />
                            Tối đa {room.maxGuests} khách
                          </li>
                        </ul>
                      </div>
                      {room.amenities.length > 0 ? (
                        <ul aria-label={`Tiện ích ${room.name}`} className="flex flex-wrap gap-2">
                          {room.amenities.map((amenity) => (
                            <li
                              key={amenity.code}
                              className="flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-1 text-sm text-ink"
                            >
                              <AmenityIcon code={amenity.code} className="size-4 shrink-0 text-primary-700" />
                              {amenity.name}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                        <p className="text-lg font-extrabold text-accent-700">
                          {formatVND(room.pricePerNight)}
                          <span className="text-sm font-medium text-ink-muted">/đêm</span>
                        </p>
                        <SelectRoomButton roomTypeId={room.id} roomName={room.name} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <HotelBookingCard hotelSlug={hotel.slug} minPricePerNight={hotel.minPricePerNight} />
        </div>
      </HotelBookingProvider>
    </>
  );
}

function AmenityIcon({ code, className }: { code: string; className: string }) {
  // `createElement`: icon được TRA từ bảng có sẵn chứ không tạo mới, nhưng viết thành `<Icon />` thì lint của React
  // Compiler coi là khai báo component trong lúc render.
  return createElement(getAmenityIcon(code), { "aria-hidden": true, className });
}

/** Khung chờ cho phần stream của trang chi tiết: dựng sẵn bố cục breadcrumb → tiêu đề → ảnh + thẻ đặt phòng. */
export function HotelDetailSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-4 h-5 w-72 max-w-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-10 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-6 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-10">
          <Skeleton className="aspect-16/9 w-full rounded-card" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    </div>
  );
}
