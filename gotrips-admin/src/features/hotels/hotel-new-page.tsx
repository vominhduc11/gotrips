import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { getGetAdminHotelQueryKey, useCreateAdminHotel } from '@/lib/api/generated/api'
import { HotelForm } from './hotel-form'
import { emptyHotel, hotelToFormValues } from './hotel-form-schema'
import { refreshHotelQueries } from './use-hotel-lifecycle'

export function HotelNewPage() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const create = useCreateAdminHotel()

  return (
    <section className="space-y-5">
      <PageHeader title="Thêm khách sạn" description="Tạo xong, thêm loại phòng để khách sạn hiện trên website." />
      <HotelForm mode="create" initialValues={emptyHotel} onSave={async (data) => {
        const hotel = await create.mutateAsync({ data })
        client.setQueryData(getGetAdminHotelQueryKey(hotel.id), hotel)
        void refreshHotelQueries(client, hotel.id)
        toast.success('Đã tạo khách sạn')
        return {
          values: hotelToFormValues(hotel),
          afterSave: () => void navigate(`/hotels/${hotel.id}?tab=rooms`),
        }
      }} />
    </section>
  )
}
