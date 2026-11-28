import { useQueryClient } from '@tanstack/react-query'
import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { SERVICE_UNAVAILABLE } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  getGetAdminBookingQueryKey, getGetAdminCustomerQueryKey, getGetAdminDashboardQueryKey,
  getListAdminBankTransactionsQueryKey, getListAdminBookingsQueryKey, getListAdminCustomersQueryKey,
  useCancelBooking, useConfirmBooking, useMarkBookingPaid,
} from '@/lib/api/generated/api'
import type { AdminBookingDetailResponse, AdminBookingSummaryResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { formatVND } from '@/lib/format'

type Action = AdminBookingDetailResponse['availableActions'][number]
type ActionBooking = Pick<AdminBookingSummaryResponse,
  'code' | 'totalAmount' | 'receivedAmount' | 'paymentStatus' | 'availableActions'>

const actionLabels: Record<Action, string> = {
  MARK_PAID: 'Đánh dấu đã nhận tiền',
  CONFIRM: 'Xác nhận đơn',
  CANCEL: 'Huỷ đơn',
}

function confirmationText(action: Action, booking: ActionBooking) {
  switch (action) {
    case 'MARK_PAID':
      // SePay thường tự đánh dấu khi khách chuyển đúng nội dung; thao tác tay dành cho tiền mặt hoặc giao dịch SePay bỏ sót.
      return `Đối chiếu sao kê và xác nhận đã nhận ${formatVND(booking.totalAmount)} với nội dung chuyển khoản ${booking.code}.` +
        ' Chuyển khoản qua SePay thường được ghi nhận tự động; chỉ dùng thao tác này cho tiền mặt hoặc giao dịch SePay chưa báo.'
    case 'CONFIRM':
      return `Xác nhận đặt chỗ cho đơn ${booking.code}.`
    case 'CANCEL':
      return `Huỷ đơn ${booking.code} sẽ trả lại chỗ, phòng hoặc ghế đã giữ.` +
        (booking.paymentStatus === 'PAID' ? ' Đơn đã thanh toán. Cần hoàn tiền thủ công cho khách.'
          : booking.receivedAmount > 0
            ? ` Đã nhận ${formatVND(booking.receivedAmount)} qua chuyển khoản, cần hoàn lại cho khách.` : '')
  }
}

function useBookingAction(code: string, close: () => void) {
  const client = useQueryClient()
  const detailKey = getGetAdminBookingQueryKey(code)
  const refreshLists = () => Promise.all([
    client.invalidateQueries({ queryKey: getListAdminBookingsQueryKey() }),
    client.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
    // Huỷ đơn đổi lý do cần xử lý của giao dịch đã nhận (đơn huỷ khi chưa đủ tiền thì phải hoàn).
    client.invalidateQueries({ queryKey: getListAdminBankTransactionsQueryKey() }),
  ])
  const mutation = {
    onSuccess: (result: AdminBookingDetailResponse) => {
      client.setQueryData(detailKey, result)
      void refreshLists()
      if (result.customer.hasCustomerProfile) {
        void client.invalidateQueries({ queryKey: getListAdminCustomersQueryKey() })
        void client.invalidateQueries({ queryKey: getGetAdminCustomerQueryKey(result.customer.id) })
      }
      toast.success('Đã cập nhật đơn đặt chỗ')
      close()
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.detail ?? 'Đơn đã thay đổi. Hãy kiểm tra trạng thái mới.')
        void client.invalidateQueries({ queryKey: detailKey })
        void refreshLists()
        close()
      } else if (error instanceof ApiError && error.status === 403) {
        toast.error('Bạn không có quyền thao tác trên đơn này.')
      } else if (!(error instanceof ApiError && error.status === 401)) {
        toast.error(SERVICE_UNAVAILABLE)
      }
    },
  }
  const mark = useMarkBookingPaid({ mutation })
  const confirm = useConfirmBooking({ mutation })
  const cancel = useCancelBooking({ mutation })
  const actions = { MARK_PAID: mark, CONFIRM: confirm, CANCEL: cancel }
  return {
    run: (action: Action) => actions[action].mutate({ code }),
    pending: Object.values(actions).some(({ isPending }) => isPending),
  }
}

export function BookingActions({ booking, inMenu = false }: { booking: ActionBooking; inMenu?: boolean }) {
  const [selected, setSelected] = useState<Action | null>(null)
  const { run, pending } = useBookingAction(booking.code, () => setSelected(null))
  const { availableActions } = booking

  if (availableActions.length === 0 && !selected) return null

  return (
    <>
      {inMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác đơn ${booking.code}`}>
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.map((action) => (
              <DropdownMenuItem key={action} variant={action === 'CANCEL' ? 'destructive' : 'default'}
                onSelect={() => setSelected(action)}>{actionLabels[action]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2" aria-label="Thao tác đơn">
          {availableActions.map((action) => (
            <Button key={action} type="button" variant={action === 'CANCEL' ? 'outline' : 'default'}
              onClick={() => setSelected(action)}>{actionLabels[action]}</Button>
          ))}
        </div>
      )}
      {selected && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setSelected(null) }} title={actionLabels[selected]}
          description={confirmationText(selected, booking)} confirmLabel={actionLabels[selected]}
          danger={selected === 'CANCEL'} pending={pending} onConfirm={() => run(selected)} />
      )}
    </>
  )
}
