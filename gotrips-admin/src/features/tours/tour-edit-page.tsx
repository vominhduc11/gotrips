import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getGetAdminTourQueryKey, getGetAdminTourQueryOptions, useUpdateAdminTour } from '@/lib/api/generated/api'
import type { AdminTourDetailResponse, AdminUpdateTourRequest } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { websiteTourUrl } from '@/lib/website'
import { DeparturesTab } from './departures-tab'
import { TourForm } from './tour-form'
import { tourToFormValues, type TourFormOutput } from './tour-form-schema'
import { deleteTourDescription, refreshTourQueries, useTourLifecycle } from './use-tour-lifecycle'

export function TourEditPage() {
  const { id } = useParams()
  // Orval ghép id thẳng vào đường dẫn API nên chỉ nhận số nguyên dương.
  if (!id || !/^[1-9]\d{0,14}$/.test(id)) return <TourNotFound />
  return <TourEditor key={id} id={Number(id)} />
}

function TourNotFound() {
  return (
    <section className="space-y-4">
      <PageHeader title="Không tìm thấy tour" />
      <Button asChild variant="outline"><Link to="/tours">Về danh sách tour</Link></Button>
    </section>
  )
}

function TourEditor({ id }: { id: number }) {
  const query = useQuery(getGetAdminTourQueryOptions(id))

  if (query.data) return <TourDetail tour={query.data} />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <TourNotFound />
    return (
      <section className="space-y-4">
        <PageHeader title="Chi tiết tour" />
        <ErrorState message={apiErrorMessage(query.error) ?? undefined} onRetry={() => void query.refetch()} />
      </section>
    )
  }
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Đang tải tour">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-96 w-full" />
    </section>
  )
}

function toUpdateRequest(values: TourFormOutput): AdminUpdateTourRequest {
  return {
    title: values.title, slug: values.slug, destinationId: values.destinationId,
    durationDays: values.durationDays, durationNights: values.durationNights, departureCity: values.departureCity,
    shortDescription: values.shortDescription, coverImageUrl: values.coverImageUrl,
    coverImageAlt: values.coverImageAlt, featured: values.featured,
  }
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-surface p-3 text-sm text-warning">
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </div>
  )
}

function TourDetail({ tour }: { tour: AdminTourDetailResponse }) {
  const client = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const update = useUpdateAdminTour()
  const lifecycle = useTourLifecycle()
  const tab = searchParams.get('tab') === 'departures' ? 'departures' : 'info'
  const openTab = (value: string) =>
    setSearchParams(value === 'departures' ? { tab: value } : {}, { replace: true })
  const deleted = tour.status === 'DELETED'

  return (
    <section className="space-y-4">
      <PageHeader title={tour.title} description={tour.destinationName} action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge group="catalog" value={tour.status} />
          {tour.status === 'ACTIVE' && (
            <Button asChild variant="outline">
              <a href={websiteTourUrl(tour.slug)} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />Xem trên website
              </a>
            </Button>
          )}
          {deleted
            ? <Button type="button" disabled={lifecycle.pending} onClick={() => lifecycle.restore(tour.id)}>
                Khôi phục
              </Button>
            : <Button type="button" variant="destructive" onClick={() => setConfirmingDelete(true)}>Xoá tour</Button>}
        </div>
      } />

      {deleted && (
        <Callout>
          Tour đã bị xoá nên không hiện trên website và không sửa được. Đơn đã đặt vẫn giữ nguyên.
        </Callout>
      )}
      {tour.status === 'ACTIVE' && tour.openDepartureCount === 0 && (
        <Callout>
          <span>Tour đang hiện nhưng không còn chuyến nào mở bán nên khách chưa đặt được.</span>
          {tab === 'info' && (
            <Button type="button" variant="outline" size="sm" onClick={() => openTab('departures')}>
              Mở Lịch khởi hành
            </Button>
          )}
        </Callout>
      )}

      <Tabs value={tab} onValueChange={openTab}>
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="departures">Lịch khởi hành</TabsTrigger>
        </TabsList>
        {/* Giữ form luôn mount để chuyển tab không làm mất nội dung đang nhập. */}
        <TabsContent value="info" forceMount className="data-[state=inactive]:hidden">
          <TourForm mode="edit" readOnly={deleted} initialValues={tourToFormValues(tour)}
            onSave={async (values) => {
              const saved = await update.mutateAsync({ id: tour.id, data: toUpdateRequest(values) })
              client.setQueryData(getGetAdminTourQueryKey(tour.id), saved)
              void refreshTourQueries(client, tour.id)
              toast.success('Đã lưu tour')
              return { values: tourToFormValues(saved) }
            }}
            statusControl={
              <Field>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">Trạng thái</span>
                  <StatusBadge group="catalog" value={tour.status} />
                  {!deleted && (
                    <Button type="button" variant="outline" size="sm" disabled={lifecycle.pending}
                      onClick={() => (tour.status === 'ACTIVE' ? lifecycle.hide : lifecycle.show)(tour.id)}>
                      {tour.status === 'ACTIVE' ? 'Ẩn tour' : 'Hiện tour'}
                    </Button>
                  )}
                </div>
                <FieldDescription>Đổi trạng thái có hiệu lực ngay, không cần bấm Lưu.</FieldDescription>
              </Field>
            }
            summary={
              <Card>
                <CardHeader><CardTitle><h2>Đánh giá (chỉ xem)</h2></CardTitle></CardHeader>
                <CardContent>
                  <p className="tabular-nums">
                    {tour.rating.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5
                    {' · '}{tour.reviewCount.toLocaleString('vi-VN')} đánh giá
                  </p>
                </CardContent>
              </Card>
            } />
        </TabsContent>
        <TabsContent value="departures">
          <DeparturesTab tourId={tour.id} readOnly={deleted} />
        </TabsContent>
      </Tabs>

      {confirmingDelete && (
        <ConfirmDialog open onOpenChange={setConfirmingDelete} title="Xoá tour"
          description={deleteTourDescription(tour.title)} confirmLabel="Xoá tour" danger pending={lifecycle.pending}
          onConfirm={() => lifecycle.remove(tour.id, () => setConfirmingDelete(false))} />
      )}
    </section>
  )
}
