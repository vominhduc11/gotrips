import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { getGetAdminCustomerQueryKey, getGetAdminDashboardQueryKey, getListAdminCustomersQueryKey } from '@/lib/api/generated/api'
import { BookingActions } from './booking-actions'

type Booking = ComponentProps<typeof BookingActions>['booking']
const booking: Booking = {
  code: 'GT7K4Q2M', totalAmount: 2_490_000, receivedAmount: 0, paymentStatus: 'UNPAID', availableActions: [],
}

function renderActions(data: Partial<Booking>, client = createAppQueryClient()) {
  render(<QueryClientProvider client={client}>
    <BookingActions booking={{ ...booking, ...data }} />
  </QueryClientProvider>)
}

afterEach(() => vi.unstubAllGlobals())

describe('Thao tác của nhân viên trên đơn', () => {
  it('chỉ hiện thao tác do API trả về', () => {
    renderActions({ availableActions: ['CONFIRM'] })
    expect(screen.getByRole('button', { name: 'Xác nhận đơn' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã nhận tiền' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Huỷ đơn' })).not.toBeInTheDocument()
  })

  it('nhắc số tiền và mã đơn trước khi đánh dấu đã nhận tiền', async () => {
    renderActions({ availableActions: ['MARK_PAID'] })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Đánh dấu đã nhận tiền' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/đối chiếu sao kê/i)).toHaveTextContent(/2\.490\.000.*GT7K4Q2M/)
  })

  it('làm mới Tổng quan khi đã thu tiền', async () => {
    const queryClient = createAppQueryClient()
    const key = getGetAdminDashboardQueryKey({ from: '2026-11-01', to: '2026-11-30' })
    queryClient.setQueryData(key, { awaitingPayment: 1 })
    const id = '12345678-0000-4000-8000-000000000001'
    const customerKey = getGetAdminCustomerQueryKey(id)
    const customerListKey = getListAdminCustomersQueryKey({ page: 2 })
    queryClient.setQueryData(customerKey, { totalPaid: 0 })
    queryClient.setQueryData(customerListKey, { items: [] })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ...booking, paymentStatus: 'PAID', customer: { id, hasCustomerProfile: true },
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })))
    const user = userEvent.setup()
    renderActions({ availableActions: ['MARK_PAID'] }, queryClient)
    await user.click(screen.getByRole('button', { name: 'Đánh dấu đã nhận tiền' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã nhận tiền' }))
    await waitFor(() => expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true))
    expect(queryClient.getQueryState(customerKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(customerListKey)?.isInvalidated).toBe(true)
  })

  it('cảnh báo hoàn tiền thủ công khi huỷ một đơn đã thanh toán', async () => {
    renderActions({ paymentStatus: 'PAID', availableActions: ['CANCEL'] })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Huỷ đơn' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Cần hoàn tiền thủ công cho khách.')
  })

  it('cảnh báo hoàn số đã nhận khi huỷ một đơn mới chuyển khoản một phần', async () => {
    renderActions({ receivedAmount: 1_000_000, availableActions: ['CANCEL'] })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Huỷ đơn' }))
    expect(await screen.findByRole('alertdialog'))
      .toHaveTextContent(/Đã nhận 1\.000\.000.*qua chuyển khoản, cần hoàn lại cho khách\./)
  })
})
