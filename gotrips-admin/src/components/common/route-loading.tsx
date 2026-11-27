import { Skeleton } from '@/components/ui/skeleton'

export function RouteLoading() {
  return (
    <main className="grid min-h-svh place-items-center p-6" aria-busy="true" aria-label="Đang tải trang">
      <Skeleton className="h-36 w-full max-w-sm" />
    </main>
  )
}
