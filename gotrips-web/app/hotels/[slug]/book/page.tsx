import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingWizardSkeleton } from "@/components/booking/BookingSkeletons";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
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
import { getHotelDetail, getHotelSlugs } from "@/lib/data/hotels";

// Như trang chi tiết: biết trước slug nên phần thông tin khách sạn prerender được; phần đọc cookie/URL stream trong Suspense.
export async function generateStaticParams() {
  return (await getHotelSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotelDetail(slug);
  return {
    title: hotel ? `Đặt phòng ${hotel.name}` : "Không tìm thấy khách sạn",
    // Trang thao tác theo từng khách, không có nội dung cho công cụ tìm kiếm.
    robots: { index: false },
  };
}

export default async function BookHotelPage({ params, searchParams }: PageProps<"/hotels/[slug]/book">) {
  const { slug } = await params;
  const hotel = await getHotelDetail(slug);
  if (!hotel) notFound();

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
      </Container>
    </div>
  );
}
