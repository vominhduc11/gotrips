import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getGetAdminDashboardQueryKey, getGetAdminHotelQueryKey, getListAdminDestinationsQueryKey, getListAdminHotelsQueryKey,
  getListAdminRoomTypesQueryKey, useDeleteAdminHotel, useRestoreAdminHotel, useUpdateAdminHotelStatus,
} from '@/lib/api/generated/api'
import type { AdminHotelDetailResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { hotelRoomWarning } from './hotel-visibility'

/**
 * Làm mới mọi dữ liệu phụ thuộc một khách sạn: danh sách, chi tiết (số loại phòng, giá từ, cờ hiện trên website), loại
 * phòng (cờ xoá được phụ thuộc trạng thái), số khách sạn của điểm đến và Tổng quan.
 */
export function refreshHotelQueries(client: QueryClient, id: number) {
  return Promise.all([
    client.invalidateQueries({ queryKey: getListAdminHotelsQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminHotelQueryKey(id) }),
    client.invalidateQueries({ queryKey: getListAdminRoomTypesQueryKey(id) }),
    client.invalidateQueries({ queryKey: getListAdminDestinationsQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
  ])
}

function statusMessage(hotel: AdminHotelDetailResponse) {
  if (hotel.status !== 'ACTIVE') return 'Đã ẩn khách sạn'
  return hotel.visibleOnWebsite
    ? 'Đã cho khách sạn hiện trên website'
    : `Đã chuyển sang đang hiện. ${hotelRoomWarning(hotel) ?? 'Khách sạn chưa hiện trên website.'}`
}

/** Ẩn, hiện, xoá mềm và khôi phục khách sạn: dùng ở menu từng dòng và ở trang chi tiết. */
export function useHotelLifecycle() {
  const client = useQueryClient()
  // API trả chi tiết mới: ghi thẳng vào cache để trang đổi ngay, rồi làm mới phần còn lại.
  const store = (hotel: AdminHotelDetailResponse) => client.setQueryData(getGetAdminHotelQueryKey(hotel.id), hotel)
  const onError = (error: unknown) => {
    const message = apiErrorMessage(error)
    if (message) toast.error(message)
  }
  // Làm mới cả khi lỗi: 409 nghĩa là trạng thái đã đổi so với màn hình đang hiện.
  const onSettled = (_data: unknown, _error: unknown, { id }: { id: number }) => {
    void refreshHotelQueries(client, id)
  }

  const status = useUpdateAdminHotelStatus({
    mutation: {
      onSuccess: (hotel) => {
        store(hotel)
        toast.success(statusMessage(hotel))
      },
      onError, onSettled,
    },
  })
  const remove = useDeleteAdminHotel({
    mutation: { onSuccess: () => toast.success('Đã xoá khách sạn'), onError, onSettled },
  })
  const restore = useRestoreAdminHotel({
    mutation: {
      onSuccess: (hotel) => {
        store(hotel)
        toast.success('Đã khôi phục khách sạn. Khách sạn đang ở trạng thái ẩn.')
      },
      onError, onSettled,
    },
  })

  return {
    show: (id: number) => status.mutate({ id, data: { status: 'ACTIVE' } }),
    hide: (id: number) => status.mutate({ id, data: { status: 'HIDDEN' } }),
    remove: (id: number, onDone: () => void) => remove.mutate({ id }, { onSettled: onDone }),
    restore: (id: number) => restore.mutate({ id }),
    pending: status.isPending || remove.isPending || restore.isPending,
  }
}

export function deleteHotelDescription(name: string) {
  return `Khách sạn "${name}" sẽ biến mất khỏi website. Đơn đã đặt vẫn giữ nguyên. Khôi phục được sau, khách sạn quay về trạng thái ẩn.`
}
