import { BedDouble, Check, Clock, MapPin, Maximize2, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { StarRating } from "@/components/common/StarRating";
import { HotelBookingCard } from "@/components/hotel/HotelBookingCard";
import { HotelBookingProvider } from "@/components/hotel/HotelBookingProvider";
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
import { getHotelDetail } from "@/lib/data/hotels";
import { loadSection } from "@/lib/data/load-section";
import { formatRating, formatVND } from "@/lib/format";

/**
 * Phần phụ thuộc URL của trang /hotels/[slug]: chi tiết khách sạn, giới thiệu, tiện ích, giờ nhận/trả phòng, các loại
 * phòng và thẻ "Đặt phòng". `params` chỉ được `await` ở đây (bên trong `<Suspense>` của page): slug không còn biết trước
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

  // Dữ liệu có cấu trúc cho công cụ tìm kiếm. Thay `<` để chuỗi từ dữ liệu không thể đóng thẻ <script> (XSS).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.description,
    image: hotel.imageUrl,
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
      <HotelBookingProvider roomTypes={hotel.roomTypes}>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <div className="min-w-0 space-y-10">
            <div className="relative aspect-16/9 overflow-hidden rounded-card shadow-card">
              <CoverImage
                src={hotel.imageUrl}
                alt={hotel.imageAlt}
                sizes="(min-width: 1280px) 800px, (min-width: 1024px) 60vw, 100vw"
                preload
              />
            </div>

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
              <h3 className="mt-6 text-lg font-bold text-ink">Tiện ích nổi bật</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {hotel.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-ink">
                    <Check aria-hidden="true" className="size-4 shrink-0 text-success-700" />
                    {amenity}
                  </li>
                ))}
              </ul>
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
                    className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
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
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <p className="text-lg font-extrabold text-accent-700">
                        {formatVND(room.pricePerNight)}
                        <span className="text-sm font-medium text-ink-muted">/đêm</span>
                      </p>
                      <SelectRoomButton roomTypeId={room.id} roomName={room.name} />
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
