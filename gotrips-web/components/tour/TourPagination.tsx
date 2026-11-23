import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLink } from "@/components/common/AppLink";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { buildTourListHref, type TourFilters } from "@/lib/schemas/tour-filters";

/**
 * Phân trang bằng liên kết `?page=n` (giữ nguyên các bộ lọc khác). Dùng `AppLink` (client-side navigation)
 * thay cho `PaginationLink` của shadcn vì component đó render thẻ `<a>` thường → tải lại cả trang.
 * Không có `PaginationEllipsis`: số trang ít, hiện đủ.
 */
export function TourPagination({
  filters,
  page,
  pageCount,
}: {
  filters: TourFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <Pagination aria-label="Phân trang danh sách tour" className="mt-10">
      <PaginationContent className="flex-wrap justify-center gap-1.5">
        {page > 1 ? (
          <PaginationItem>
            <Button asChild variant="ghost" size="sm">
              <AppLink href={buildTourListHref(filters, { page: page - 1 })} rel="prev">
                <ChevronLeft aria-hidden="true" className="size-4" />
                Trang trước
              </AppLink>
            </Button>
          </PaginationItem>
        ) : null}

        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
          <PaginationItem key={number}>
            <Button asChild variant={number === page ? "primary" : "ghost"} size="icon-sm">
              <AppLink
                href={buildTourListHref(filters, { page: number })}
                aria-current={number === page ? "page" : undefined}
                aria-label={`Trang ${number}`}
              >
                {number}
              </AppLink>
            </Button>
          </PaginationItem>
        ))}

        {page < pageCount ? (
          <PaginationItem>
            <Button asChild variant="ghost" size="sm">
              <AppLink href={buildTourListHref(filters, { page: page + 1 })} rel="next">
                Trang sau
                <ChevronRight aria-hidden="true" className="size-4" />
              </AppLink>
            </Button>
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
