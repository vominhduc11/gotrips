import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
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
import { getGetAdminHotelQueryKey, getGetAdminHotelQueryOptions, useUpdateAdminHotel } from '@/lib/api/generated/api'
import type { AdminHotelDetailResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatVND } from '@/lib/format'
import { websiteHotelUrl } from '@/lib/website'
import { HotelForm } from './hotel-form'
import { hotelToFormValues, toHotelUpdateRequest } from './hotel-form-schema'
import { hotelRoomWarning } from './hotel-visibility'
import { RoomTypesTab } from './room-types-tab'
import { deleteHotelDescription, refreshHotelQueries, useHotelLifecycle } from './use-hotel-lifecycle'

export function HotelEditPage() {
  const { id } = useParams()
  // Orval ghép id thẳng vào đường dẫn API nên chỉ nhận số nguyên dương.
  if (!id || !/^[1-9]\d{0,14}$/.test(id)) return <HotelNotFound />
  return <HotelEditor key={id} id={Number(id)} />
}

function HotelNotFound() {
  return (
    <section className="space-y-4">
      <PageHeader title="Không tìm thấy khách sạn" />
      <Button asChild variant="outline"><Link to="/hotels">Về danh sách khách sạn</Link></Button>
    </section>
  )
}

function HotelEditor({ id }: { id: number }) {
  const query = useQuery(getGetAdminHotelQueryOptions(id))

  if (query.data) return <HotelDetail hotel={query.data} />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) return <HotelNotFound />
    return (
      <section className="space-y-4">
        <PageHeader title="Chi tiết khách sạn" />
        <ErrorState message={apiErrorMessage(query.error) ?? undefined} onRetry={() => void query.refetch()} />
      </section>
    )
  }
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Đang tải khách sạn">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-8 w-60" />
      <Skeleton className="h-96 w-full" />
    </section>
  )
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-surface p-3 text-sm text-warning">
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </div>
  )
}

function HotelDetail({ hotel }: { hotel: AdminHotelDetailResponse }) {
  const client = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const update = useUpdateAdminHotel()
  const lifecycle = useHotelLifecycle()
  const tab = searchParams.get('tab') === 'rooms' ? 'rooms' : 'info'
  const openTab = (value: string) => setSearchParams(value === 'rooms' ? { tab: value } : {}, { replace: true })
  const deleted = hotel.status === 'DELETED'
  const warning = hotelRoomWarning(hotel)
  const price = hotel.minPricePerNight === null ? '—' : formatVND(hotel.minPricePerNight)

  return (
    <section className="space-y-4">
      <PageHeader title={hotel.name} description={`${hotel.destinationName} · ${hotel.area} · Giá từ mỗi đêm ${price}`} action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge group="catalog" value={hotel.status} />
          {hotel.visibleOnWebsite && (
            <Button asChild variant="outline">
              <a href={websiteHotelUrl(hotel.slug)} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />Xem trên website
              </a>
            </Button>
          )}
          {deleted
            ? <Button type="button" disabled={lifecycle.pending} onClick={() => lifecycle.restore(hotel.id)}>
                Khôi phục
              </Button>
            : <Button type="button" variant="destructive" onClick={() => setConfirmingDelete(true)}>
                Xoá khách sạn
              </Button>}
        </div>
      } />

      {deleted && (
        <Callout>
          Khách sạn đã bị xoá nên không hiện trên website và không sửa được. Đơn đã đặt vẫn giữ nguyên.
        </Callout>
      )}
      {warning && (
        <Callout>
          <span>{warning}</span>
          {tab === 'info' && (
            <Button type="button" variant="outline" size="sm" onClick={() => openTab('rooms')}>
              Mở Loại phòng
            </Button>
          )}
        </Callout>
      )}

      <Tabs value={tab} onValueChange={openTab}>
        <TabsList>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="rooms">Loại phòng</TabsTrigger>
        </TabsList>
        {/* Giữ form luôn mount để chuyển tab không làm mất nội dung đang nhập. */}
        <TabsContent value="info" forceMount className="data-[state=inactive]:hidden">
          <HotelForm mode="edit" readOnly={deleted} initialValues={hotelToFormValues(hotel)}
            onSave={async (values) => {
              const saved = await update.mutateAsync({ id: hotel.id, data: toHotelUpdateRequest(values) })
              client.setQueryData(getGetAdminHotelQueryKey(hotel.id), saved)
              void refreshHotelQueries(client, hotel.id)
              toast.success('Đã lưu khách sạn')
              return { values: hotelToFormValues(saved) }
            }}
            statusControl={
              <Field>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">Trạng thái</span>
                  <StatusBadge group="catalog" value={hotel.status} />
                  {!deleted && (
                    <Button type="button" variant="outline" size="sm" disabled={lifecycle.pending}
                      onClick={() => (hotel.status === 'ACTIVE' ? lifecycle.hide : lifecycle.show)(hotel.id)}>
                      {hotel.status === 'ACTIVE' ? 'Ẩn khách sạn' : 'Hiện khách sạn'}
                    </Button>
                  )}
                </div>
                {!deleted && <FieldDescription>Đổi trạng thái có hiệu lực ngay, không cần bấm Lưu.</FieldDescription>}
              </Field>
            }
            summary={
              <Card>
                <CardHeader><CardTitle><h2>Đánh giá (chỉ xem)</h2></CardTitle></CardHeader>
                <CardContent>
                  <p className="tabular-nums">
                    {hotel.rating.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5
                    {' · '}{hotel.reviewCount.toLocaleString('vi-VN')} đánh giá
                  </p>
                </CardContent>
              </Card>
            } />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomTypesTab hotel={hotel} />
        </TabsContent>
      </Tabs>

      {confirmingDelete && (
        <ConfirmDialog open onOpenChange={setConfirmingDelete} title="Xoá khách sạn"
          description={deleteHotelDescription(hotel.name)} confirmLabel="Xoá khách sạn" danger
          pending={lifecycle.pending}
          onConfirm={() => lifecycle.remove(hotel.id, () => setConfirmingDelete(false))} />
      )}
    </section>
  )
}
