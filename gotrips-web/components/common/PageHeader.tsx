import { AppLink } from "@/components/common/AppLink";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Đầu trang của các trang mục trong menu chính (`/tours`, `/destinations`, `/hotels`, `/flights`):
 * breadcrumb "Trang chủ / <tên trang>", `h1` duy nhất của trang và một đoạn mô tả ngắn.
 */
export function PageHeader({ title, description }: { title: string; description: string }) {
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
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-ink-muted">{description}</p>
    </>
  );
}
