import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingWizardSkeleton } from "@/components/booking/BookingSkeletons";
import { AppLink } from "@/components/common/AppLink";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { TrialNotice } from "@/components/common/TrialNotice";
import { HotelBookingGate } from "@/components/hotel/HotelBookingGate";
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

/**
 * Nội dung trang /hotels/[slug]/book. `params` chỉ được `await` ở đây (bên trong `<Suspense>` của page): slug không còn
 * biết trước lúc build (không có `generateStaticParams`, vì danh sách khách sạn nằm ở gotrips-api), nên đọc `params` ở
 * cấp trên cùng sẽ buộc cả App Shell vào một slug (xem `HotelDetail`). Phần đọc cookie/URL của form nằm trong
 * `HotelBookingGate`.
 */
export async function BookHotelContent({
  params,
  searchParams,
}: Pick<PageProps<"/hotels/[slug]/book">, "params" | "searchParams">) {
  const { slug } = await params;
  const detail = await loadSection("chi tiết khách sạn", () => getHotelDetail(slug));
  if (!detail.ok) return <SectionUnavailable what="thông tin khách sạn" className="bg-surface shadow-card" />;
  const hotel = detail.data;
  if (!hotel) notFound();

  return (
    <>
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
            <BreadcrumbLink asChild>
              <AppLink href={`/hotels/${hotel.slug}`}>{hotel.name}</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Đặt phòng</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Đặt phòng</h1>
      <p className="mt-2 text-base text-ink-muted">{hotel.name}</p>

      <TrialNotice className="mt-6 mb-8">
        Bản thử nghiệm: đơn chỉ được lưu trên trình duyệt này, chưa thu tiền thật và chưa giữ phòng với khách sạn.
      </TrialNotice>

      <Suspense fallback={<BookingWizardSkeleton />}>
        <HotelBookingGate hotel={hotel} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Khung chờ khi đang đọc `params` và tải khách sạn: dựng sẵn breadcrumb → tiêu đề → form + thẻ tóm tắt. */
export function BookHotelSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-4 h-5 w-72 max-w-full" />
      <Skeleton className="h-10 w-40" />
      <Skeleton className="mt-2 h-6 w-80 max-w-full" />
      <Skeleton className="mt-6 mb-8 h-14 w-full rounded-card" />
      <BookingWizardSkeleton />
    </div>
  );
}
