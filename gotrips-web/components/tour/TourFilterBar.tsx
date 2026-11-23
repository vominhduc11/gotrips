import { X } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { TourSortSelect } from "@/components/tour/TourSortSelect";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import {
  buildTourListHref,
  TOUR_SORT_OPTIONS,
  type TourFilters,
  type TourSort,
} from "@/lib/schemas/tour-filters";
import type { DestinationCardView } from "@/lib/types";

const pillClass =
  "inline-flex h-10 items-center rounded-pill border px-4 text-sm font-semibold transition-colors";

/**
 * Thanh lọc của /tours: chip điểm đến (liên kết thường, không cần JS), chip bộ lọc đang bật (bấm để gỡ)
 * và ô sắp xếp. Mọi thay đổi đều là đổi URL; không có state riêng.
 */
export function TourFilterBar({
  filters,
  destinations,
}: {
  filters: TourFilters;
  destinations: DestinationCardView[];
}) {
  const sortHrefs = Object.fromEntries(
    TOUR_SORT_OPTIONS.map((o) => [o.value, buildTourListHref(filters, { sort: o.value })]),
  ) as Record<TourSort, string>;

  const activeChips: { key: string; label: string; href: string }[] = [];
  if (filters.q) activeChips.push({ key: "q", label: `Từ khoá: ${filters.q}`, href: buildTourListHref(filters, { q: undefined }) });
  if (filters.date)
    activeChips.push({ key: "date", label: `Ngày đi: ${formatDate(filters.date)}`, href: buildTourListHref(filters, { date: undefined }) });
  if (filters.guests)
    activeChips.push({ key: "guests", label: `${filters.guests} khách`, href: buildTourListHref(filters, { guests: undefined }) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <nav aria-label="Lọc theo điểm đến" className="min-w-0">
          <ul className="flex flex-wrap gap-2">
            <li>
              <AppLink
                href={buildTourListHref(filters, { destination: undefined })}
                aria-current={filters.destination ? undefined : "true"}
                className={cn(
                  pillClass,
                  filters.destination
                    ? "border-line bg-surface text-ink hover:bg-primary-50"
                    : "border-primary-700 bg-primary-700 text-white",
                )}
              >
                Tất cả
              </AppLink>
            </li>
            {destinations.map((destination) => {
              const active = filters.destination === destination.slug;
              return (
                <li key={destination.id}>
                  <AppLink
                    href={buildTourListHref(filters, { destination: destination.slug })}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      pillClass,
                      active
                        ? "border-primary-700 bg-primary-700 text-white"
                        : "border-line bg-surface text-ink hover:bg-primary-50",
                    )}
                  >
                    {destination.name}
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-ink">Sắp xếp</span>
          <TourSortSelect value={filters.sort} hrefs={sortHrefs} />
        </div>
      </div>

      {activeChips.length > 0 ? (
        <ul aria-label="Bộ lọc đang áp dụng" className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <li key={chip.key}>
              <AppLink
                href={chip.href}
                aria-label={`Bỏ bộ lọc ${chip.label}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary-50 px-3 text-sm font-medium text-primary-800 hover:bg-primary-100"
              >
                {chip.label}
                <X aria-hidden="true" className="size-4" />
              </AppLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
