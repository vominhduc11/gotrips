import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import type { AdminBankTransactionResponse } from '@/lib/api/generated/model'

const staff = { id: 'staff', fullName: 'Nhân viên A', email: 'staff@example.com', roles: ['STAFF'] }

const base: AdminBankTransactionResponse = {
  id: 4, sepayId: 92704, gateway: 'Vietcombank', accountNumber: '12345678', amount: 70_000, appliedAmount: 0,
  content: 'NGUYEN VAN A chuyen tien', referenceCode: 'FT2611250001', transactionAt: '2026-11-25T01:29:12Z',
  receivedAt: '2026-11-25T01:29:20Z', outcome: 'UNMATCHED', bookingCode: null, reviewReason: 'UNMATCHED',
  reviewAmount: 70_000, needsReview: true, availableActions: ['ASSIGN', 'RESOLVE'], assignedAt: null,
  assignedByName: null, resolvedAt: null, resolvedByName: null, resolutionNote: null,
}
const unmatched = base
const overpaid: AdminBankTransactionResponse = {
  ...base, id: 5, sepayId: 92705, amount: 7_180_000, appliedAmount: 6_980_000, content: 'GT7K4Q2M chuyen tien',
  outcome: 'OVERPAID', bookingCode: 'GT7K4Q2M', reviewReason: 'OVERPAID', reviewAmount: 200_000,
  availableActions: ['RESOLVE'],
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function page(items: unknown[], totalItems = items.length) {
  return { items, page: 1, size: 20, totalItems, totalPages: 1 }
}

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>

function open(path: string, handle: Handler) {
  const fetch = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/admin/auth/me') return json(staff)
    if (url.pathname === '/api/admin/bookings' && url.searchParams.get('status') === 'PENDING') return json(page([]))
    return handle(url, init)
  })
  vi.stubGlobal('fetch', fetch)
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /><Toaster /></QueryClientProvider>)
  return { router, fetch }
}

/** Danh sách cần xử lý; huy hiệu sidebar hỏi cùng endpoint với size=1. */
const listHandler: Handler = (url) => {
  if (url.pathname !== '/api/admin/bank-transactions') return json({}, 404)
  return json(page(url.searchParams.get('needsReview') === 'false' ? [] : [unmatched, overpaid]))
}

function posts(fetch: ReturnType<typeof open>['fetch'], suffix: string) {
  return fetch.mock.calls.filter(([input, init]) => init?.method === 'POST' && String(input).endsWith(suffix))
}

beforeAll(async () => {
  await Promise.all([import('./payment-list-page'), import('@/features/bookings/booking-detail-page')])
})
afterEach(() => vi.unstubAllGlobals())

describe('Giao dịch ngân hàng', () => {
  it('mặc định hiện giao dịch cần xử lý với lý do, số tiền và huy hiệu ở menu', async () => {
    const { router, fetch } = open('/payments', listHandler)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Giao dịch ngân hàng' })).toHaveFocus())
    const table = screen.getByRole('table', { name: 'Danh sách giao dịch ngân hàng' })
    expect(await within(table).findByText('Không khớp đơn')).toBeInTheDocument()
    expect(within(table).getByText('Cần xử lý 70.000 ₫')).toBeInTheDocument()
    expect(within(table).getByText('Chuyển thừa')).toBeInTheDocument()
    expect(within(table).getByText('Khách chuyển thừa. Hoàn phần thừa cho khách.')).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: 'GT7K4Q2M' })).toHaveAttribute('href', '/bookings/GT7K4Q2M')
    expect(within(table).getByText('Tính vào đơn 6.980.000 ₫')).toBeInTheDocument()
    expect(await screen.findByLabelText('2 giao dịch cần xử lý')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cần xử lý' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.setup().click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(new URLSearchParams(router.state.location.search).get('tab')).toBe('all')
    await waitFor(() => expect(fetch.mock.calls.some(([input]) => {
      const url = new URL(input, 'http://localhost')
      return url.pathname === '/api/admin/bank-transactions' && !url.searchParams.has('needsReview')
    })).toBe(true))
  })

  it('gắn vào đơn bằng mã chữ hoa và hiện lỗi API ngay tại ô mã đơn', async () => {
    let attempt = 0
    const { fetch } = open('/payments', (url, init) => {
      if (init?.method === 'POST') {
        attempt += 1
        return attempt === 1
          ? json({ detail: 'Dữ liệu gửi lên không hợp lệ',
            errors: [{ field: 'bookingCode', message: 'Không tìm thấy đơn GT7K4Q2M.' }] }, 400)
          : json({ ...unmatched, outcome: 'APPLIED', bookingCode: 'GT7K4Q2M', appliedAmount: 70_000,
            reviewReason: 'NONE', reviewAmount: 0, needsReview: false, availableActions: [] })
      }
      return listHandler(url, init)
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: `Thao tác giao dịch ${unmatched.sepayId}` }))
    await user.click(await screen.findByRole('menuitem', { name: 'Gắn vào đơn' }))
    const dialog = await screen.findByRole('dialog', { name: 'Gắn giao dịch vào đơn' })
    expect(within(dialog).getByText('NGUYEN VAN A chuyen tien')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Gắn vào đơn' }))
    expect(await within(dialog).findByText('Nhập mã đơn.')).toBeInTheDocument()
    expect(posts(fetch, '/assign')).toHaveLength(0)

    const input = within(dialog).getByLabelText('Mã đơn')
    await user.type(input, ' gt7k4q2m ')
    await user.click(within(dialog).getByRole('button', { name: 'Gắn vào đơn' }))
    expect(await within(dialog).findByText('Không tìm thấy đơn GT7K4Q2M.')).toBeInTheDocument()
    expect(input).toHaveFocus()
    const [[url, init]] = posts(fetch, '/assign')
    expect(url).toContain(`/admin/bank-transactions/${unmatched.id}/assign`)
    expect(JSON.parse(String(init?.body))).toEqual({ bookingCode: 'GT7K4Q2M' })

    await user.click(within(dialog).getByRole('button', { name: 'Gắn vào đơn' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Đã gắn giao dịch vào đơn GT7K4Q2M')).toBeInTheDocument()
  })

  it('bắt ghi chú trước khi đánh dấu đã xử lý', async () => {
    const { fetch } = open('/payments', (url, init) => init?.method === 'POST'
      ? json({ ...overpaid, needsReview: false, availableActions: [], resolvedAt: '2026-11-25T02:00:00Z',
        resolvedByName: staff.fullName, resolutionNote: 'Đã hoàn 200.000 ₫' })
      : listHandler(url, init))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: `Thao tác giao dịch ${overpaid.sepayId}` }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Gắn vào đơn' })).not.toBeInTheDocument()
    await user.click(within(menu).getByRole('menuitem', { name: 'Đánh dấu đã xử lý' }))
    const dialog = await screen.findByRole('dialog', { name: 'Đánh dấu đã xử lý' })
    expect(within(dialog).getByText(/Cần xử lý 200\.000/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Cách đã xử lý'), '   ')
    await user.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }))
    expect(await within(dialog).findByText('Ghi lại cách đã xử lý giao dịch.')).toBeInTheDocument()
    expect(posts(fetch, '/resolve')).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('Cách đã xử lý'), 'Đã hoàn 200.000 ₫')
    await user.click(within(dialog).getByRole('button', { name: 'Đánh dấu đã xử lý' }))
    await waitFor(() => expect(posts(fetch, '/resolve')).toHaveLength(1))
    expect(JSON.parse(String(posts(fetch, '/resolve')[0][1]?.body))).toEqual({ note: 'Đã hoàn 200.000 ₫' })
  })

  it('chi tiết đơn hiện số đã nhận, số còn thiếu và các lần chuyển của đơn', async () => {
    const booking = {
      code: 'GT7K4Q2M', kind: 'TOUR', status: 'PENDING', paymentStatus: 'UNPAID', totalAmount: 6_980_000,
      receivedAmount: 3_000_000, createdAt: '2026-11-25T01:00:00Z', availableActions: ['MARK_PAID', 'CANCEL'],
      contact: { fullName: 'An', email: 'an@example.com', phone: '0900000000' },
      customer: { id: 'c1', fullName: 'An', email: 'an@example.com', hasCustomerProfile: true },
      note: null, paidAt: null, confirmedAt: null, cancelledAt: null,
      bankTransfer: { bankName: 'VCB', accountNumber: '1234', accountName: 'GOTRIPS', content: 'GT7K4Q2M',
        amountDue: 3_980_000, qrImageUrl: null },
      tour: { tourTitle: 'Tour Đà Lạt', departureDate: '2027-01-23', departureCity: 'TP. HCM', guests: 2,
        unitPrice: 3_490_000, travelers: [] },
    }
    const applied = { ...unmatched, id: 9, outcome: 'APPLIED', bookingCode: 'GT7K4Q2M', amount: 3_000_000,
      appliedAmount: 3_000_000, reviewReason: 'NONE', reviewAmount: 0, needsReview: false, availableActions: [] }
    const { fetch } = open('/bookings/GT7K4Q2M', (url) => url.pathname === '/api/admin/bank-transactions'
      ? json(page(url.searchParams.get('bookingCode') ? [applied] : []))
      : json(booking))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Đơn GT7K4Q2M' })).toHaveFocus())
    expect(screen.getByText('Còn thiếu')).toBeInTheDocument()
    expect(screen.getByText('3.980.000 ₫')).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Giao dịch của đơn GT7K4Q2M' })
    expect(within(list).getByText('Đã tính vào đơn')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem ở Giao dịch ngân hàng' }))
      .toHaveAttribute('href', '/payments?tab=all&q=GT7K4Q2M')
    const byBooking = fetch.mock.calls.map(([input]) => new URL(input, 'http://localhost'))
      .find((url) => url.searchParams.has('bookingCode'))
    expect(byBooking?.searchParams.get('bookingCode')).toBe('GT7K4Q2M')
  })
})
