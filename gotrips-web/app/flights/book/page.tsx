import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizardSkeleton } from "@/components/booking/BookingSkeletons";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { FlightBookingGate } from "@/components/flight/FlightBookingGate";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const metadata: Metadata = {
  title: "Đặt vé máy bay",
  // Trang thao tác theo từng khách, không có nội dung cho công cụ tìm kiếm.
  robots: { index: false },
};

/**
 * /flights/book — trang đặt vé 2 bước. Lượt tìm + chuyến đã chọn nằm trên URL (`?…&out&ret&step`), nên toàn bộ phần
 * đọc URL/cookie nằm trong `<Suspense>`; tiêu đề vẫn prerender.
 */
export default function BookFlightPage({ searchParams }: PageProps<"/flights/book">) {
  return (
    <div className="py-8 sm:py-12">
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
                <AppLink href="/flights">Vé máy bay</AppLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Đặt vé</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Đặt vé máy bay</h1>

        <div className="mt-8">
          <Suspense fallback={<BookingWizardSkeleton />}>
            <FlightBookingGate searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
