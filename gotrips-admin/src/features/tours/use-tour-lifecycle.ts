import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getGetAdminDashboardQueryKey, getGetAdminTourQueryKey, getListAdminDeparturesQueryKey, getListAdminDestinationsQueryKey,
  getListAdminToursQueryKey, useDeleteAdminTour, useRestoreAdminTour, useUpdateAdminTourStatus,
} from '@/lib/api/generated/api'
import type { AdminTourDetailResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'

/**
 * Làm mới mọi dữ liệu phụ thuộc một tour: danh sách, chi tiết, chuyến (cờ thao tác phụ thuộc trạng thái tour) và số
 * tour của điểm đến, cùng số liệu Tổng quan.
 */
export function refreshTourQueries(client: QueryClient, id: number) {
  return Promise.all([
    client.invalidateQueries({ queryKey: getListAdminToursQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminTourQueryKey(id) }),
    client.invalidateQueries({ queryKey: getListAdminDeparturesQueryKey(id) }),
    client.invalidateQueries({ queryKey: getListAdminDestinationsQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
  ])
}

/** Ẩn, hiện, xoá mềm và khôi phục tour: dùng ở menu từng dòng và ở trang chi tiết. */
export function useTourLifecycle() {
  const client = useQueryClient()
  // API trả chi tiết mới: ghi thẳng vào cache để trang đổi ngay, rồi làm mới phần còn lại.
  const store = (tour: AdminTourDetailResponse) => client.setQueryData(getGetAdminTourQueryKey(tour.id), tour)
  const onError = (error: unknown) => {
    const message = apiErrorMessage(error)
    if (message) toast.error(message)
  }
  // Làm mới cả khi lỗi: 409 nghĩa là trạng thái đã đổi so với màn hình đang hiện.
  const onSettled = (_data: unknown, _error: unknown, { id }: { id: number }) => {
    void refreshTourQueries(client, id)
  }

  const status = useUpdateAdminTourStatus({
    mutation: {
      onSuccess: (tour) => {
        store(tour)
        toast.success(tour.status === 'ACTIVE' ? 'Đã cho tour hiện trên website' : 'Đã ẩn tour')
      },
      onError, onSettled,
    },
  })
  const remove = useDeleteAdminTour({
    mutation: { onSuccess: () => toast.success('Đã xoá tour'), onError, onSettled },
  })
  const restore = useRestoreAdminTour({
    mutation: {
      onSuccess: (tour) => {
        store(tour)
        toast.success('Đã khôi phục tour. Tour đang ở trạng thái ẩn.')
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

export function deleteTourDescription(title: string) {
  return `Tour "${title}" sẽ biến mất khỏi website. Đơn đã đặt vẫn giữ nguyên. Khôi phục được sau, tour quay về trạng thái ẩn.`
}
