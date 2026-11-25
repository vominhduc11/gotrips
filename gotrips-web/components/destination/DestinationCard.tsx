import { AppLink } from "@/components/common/AppLink";
import { CoverImage } from "@/components/common/CoverImage";
import type { DestinationCardView } from "@/lib/types";

/**
 * Thẻ điểm đến (ảnh phủ kín + tên + số tour), dùng ở section "Điểm đến phổ biến" của Trang chủ và trang `/destinations`.
 * Bấm thẻ mở `/tours` đã lọc theo điểm đến đó (cùng quy ước `destination=<slug>` với form tìm tour).
 */
export function DestinationCard({ destination }: { destination: DestinationCardView }) {
  return (
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
        <span className="block text-xs font-medium uppercase tracking-wide text-neutral-100">{destination.region}</span>
        <span className="mt-0.5 block text-lg font-bold sm:text-xl">{destination.name}</span>
        <span className="mt-0.5 block text-sm text-neutral-100">
          {destination.tourCount > 0 ? `${destination.tourCount} tour` : "Sắp có tour"}
        </span>
      </div>
    </AppLink>
  );
}
