import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingGate } from "@/components/booking/BookingGate";
import { BookingWizardSkeleton } from "@/components/booking/BookingSkeletons";
import { AppLink } from "@/components/common/AppLink";
import { SectionUnavailable } from "@/components/common/SectionUnavailable";
import { TrialNotice } from "@/components/common/TrialNotice";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSection } from "@/lib/data/load-section";
import { getTourDetail } from "@/lib/data/tours";

/**
 * Nội dung trang /tours/[slug]/book. `params` chỉ được `await` ở đây (bên trong `<Suspense>` của page): slug không còn biết
 * trước lúc build (không có `generateStaticParams`, vì danh sách tour nằm ở gotrips-api), nên đọc `params` ở cấp trên cùng
 * sẽ buộc cả App Shell vào một slug (xem `TourDetail`). Phần đọc cookie/URL của form nằm trong `BookingGate`.
 */
export async function BookTourContent({
  params,
  searchParams,
}: Pick<PageProps<"/tours/[slug]/book">, "params" | "searchParams">) {
  const { slug } = await params;
  const detail = await loadSection("chi tiết tour", () => getTourDetail(slug));
  if (!detail.ok) return <SectionUnavailable what="thông tin tour" className="bg-surface shadow-card" />;
  const tour = detail.data;
  if (!tour) notFound();

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
              <AppLink href="/tours">Tour du lịch</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <AppLink href={`/tours/${tour.slug}`}>{tour.title}</AppLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Đặt tour</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Đặt tour</h1>
      <p className="mt-2 text-base text-ink-muted">{tour.title}</p>

      <TrialNotice className="mt-6 mb-8">
        Bản thử nghiệm: đơn chỉ được lưu trên trình duyệt này, chưa thu tiền thật và chưa trừ số chỗ của tour.
      </TrialNotice>

      <Suspense fallback={<BookingWizardSkeleton />}>
        <BookingGate tour={tour} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Khung chờ khi đang đọc `params` và tải tour: dựng sẵn breadcrumb → tiêu đề → form + thẻ tóm tắt. */
export function BookTourSkeleton() {
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
