import { Skeleton } from "@/components/ui/skeleton";

/** Khung chờ trong lúc stream phần đọc cookie (form đặt tour, danh sách/chi tiết đơn). */
export function BookingWizardSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}

export function BookingListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-36 w-full rounded-card" />
      ))}
    </div>
  );
}

export function BookingDetailSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    </div>
  );
}
