import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { getGetAdminTourQueryKey, useCreateAdminTour } from '@/lib/api/generated/api'
import { TourForm } from './tour-form'
import { emptyTour, tourToFormValues } from './tour-form-schema'
import { refreshTourQueries } from './use-tour-lifecycle'

export function TourNewPage() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const create = useCreateAdminTour()

  return (
    <section className="space-y-5">
      <PageHeader title="Thêm tour" description="Tạo xong, thêm chuyến khởi hành để khách đặt được." />
      <TourForm mode="create" initialValues={emptyTour} onSave={async (data) => {
        const tour = await create.mutateAsync({ data })
        client.setQueryData(getGetAdminTourQueryKey(tour.id), tour)
        void refreshTourQueries(client, tour.id)
        toast.success('Đã tạo tour')
        return {
          values: tourToFormValues(tour),
          afterSave: () => void navigate(`/tours/${tour.id}?tab=departures`),
        }
      }} />
    </section>
  )
}
