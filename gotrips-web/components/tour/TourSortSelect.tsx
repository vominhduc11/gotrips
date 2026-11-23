"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOUR_SORT_OPTIONS, type TourSort } from "@/lib/schemas/tour-filters";

/**
 * Ô chọn kiểu sắp xếp. Không giữ state riêng: giá trị lấy từ URL (`value`), chọn xong thì điều hướng sang
 * URL mới. `hrefs` do server dựng sẵn (giữ nguyên các bộ lọc khác, về trang 1) nên client không cần biết bộ lọc.
 */
export function TourSortSelect({ value, hrefs }: { value: TourSort; hrefs: Record<TourSort, string> }) {
  const router = useRouter();

  return (
    <Select value={value} onValueChange={(next) => router.push(hrefs[next as TourSort], { scroll: false })}>
      <SelectTrigger
        aria-label="Sắp xếp tour"
        className="min-w-60 border-neutral-500 bg-surface text-ink data-[size=default]:h-11"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {TOUR_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
