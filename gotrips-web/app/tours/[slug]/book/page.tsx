import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingGate } from "@/components/booking/BookingGate";
import { BookingWizardSkeleton } from "@/components/booking/BookingSkeletons";
import { AppLink } from "@/components/common/AppLink";
import { Container } from "@/components/common/Container";
import { TrialNotice } from "@/components/common/TrialNotice";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getTourDetail, getTourSlugs } from "@/lib/data/tours";

// Như trang chi tiết: biết trước slug nên phần thông tin tour prerender được; phần đọc cookie/URL stream trong Suspense.
export async function generateStaticParams() {
  return (await getTourSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/tours/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourDetail(slug);
  return {
    title: tour ? `Đặt tour ${tour.title}` : "Không tìm thấy tour",
    // Trang thao tác theo từng khách, không có nội dung cho công cụ tìm kiếm.
    robots: { index: false },
  };
}

export default async function BookTourPage({ params, searchParams }: PageProps<"/tours/[slug]/book">) {
  const { slug } = await params;
  const tour = await getTourDetail(slug);
  if (!tour) notFound();

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
      </Container>
    </div>
  );
}
