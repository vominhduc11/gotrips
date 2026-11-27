import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import type { AdminCustomerResponse } from '@/lib/api/generated/model'

const customer: AdminCustomerResponse = {
  id: '12345678-0000-4000-8000-000000000001',
  fullName: 'Hồ sơ An', email: 'an@example.com', bookingCount: 2, totalPaid: 125_000,
  createdAt: '2026-11-25T03:00:00Z', lastBookingAt: '2026-11-26T03:00:00Z',
}
const staff = { id: 'staff', fullName: 'Nhân viên A', email: 'staff@example.com', roles: ['STAFF'] }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function page(items: unknown[], number = 1, size = 20, totalItems = items.length, totalPages = 1) {
  return { items, page: number, size, totalItems, totalPages }
}

function open(path: string, handle: (url: URL) => Response | Promise<Response>) {
  const fetch = vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/api/admin/auth/me') return json(staff)
    if (url.searchParams.get('status') === 'PENDING' && !url.searchParams.has('customerId')) return json(page([]))
    return handle(url)
  })
  vi.stubGlobal('fetch', fetch)
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { router, fetch }
}

beforeAll(async () => {
  await Promise.all([import('./customer-list-page'), import('./customer-detail-page')])
})
afterEach(() => vi.unstubAllGlobals())

describe('Quản lý khách hàng', () => {
  it('đọc bộ lọc từ URL, giữ thứ tự và cỡ trang khi tìm rồi về trang 1', async () => {
    const { router, fetch } = open('/customers?sort=PAID_DESC&size=10&page=2', (url) => {
      return json(url.searchParams.get('q') ? page([], 1, 10) : page([customer], Number(url.searchParams.get('page')), 10, 25, 3))
    })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Khách hàng' })).toHaveFocus())
    const table = screen.getByRole('table', { name: 'Danh sách khách hàng' })
    expect(await within(table).findByRole('link', { name: customer.fullName })).toHaveAttribute('href', `/customers/${customer.id}`)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('3')
    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Tìm khách hàng' }), 'Không có')
    expect(await within(table).findByText('Không tìm thấy khách hàng phù hợp')).toBeInTheDocument()
    const params = new URLSearchParams(router.state.location.search)
    expect(Object.fromEntries(params)).toEqual({ q: 'Không có', sort: 'PAID_DESC', size: '10' })
    expect(fetch.mock.calls.some(([input]) => input.includes('q=') && input.includes('page=1'))).toBe(true)
  })

  it('lấy mọi trạng thái đơn theo đúng khách và sao chép email', async () => {
    const booking = {
      code: 'GT555552', kind: 'TOUR', status: 'CONFIRMED', paymentStatus: 'PAID', totalAmount: 125_000,
      createdAt: '2026-11-26T03:00:00Z', contact: { fullName: 'An', email: customer.email, phone: '0900000000' },
      tour: { tourTitle: 'Tour Đà Lạt', departureDate: '2026-12-01' },
    }
    const { fetch } = open(`/customers/${customer.id}`, (url) =>
      json(url.pathname === '/api/admin/bookings' ? page([booking]) : customer))
    await waitFor(() => expect(screen.getByRole('heading', { name: customer.fullName })).toHaveFocus())
    const table = screen.getByRole('table', { name: 'Đơn đặt chỗ của khách' })
    expect(await within(table).findByRole('link', { name: booking.code })).toBeInTheDocument()
    expect(within(table).getByText('Đã xác nhận')).toBeInTheDocument()
    const url = fetch.mock.calls.map(([input]) => new URL(input, 'http://localhost'))
      .find((input) => input.searchParams.has('customerId'))
    expect(url?.searchParams.get('customerId')).toBe(customer.id)
    expect(url?.searchParams.get('status')).toBeNull()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sao chép email' }))
    expect(await navigator.clipboard.readText()).toBe(customer.email)
  })

  it('hiện khung chờ, báo lỗi chi tiết và thử lại được', async () => {
    let finish!: (response: Response) => void
    let failed = false
    const { fetch } = open(`/customers/${customer.id}`, (url) => {
      if (url.pathname === '/api/admin/bookings') return json(page([]))
      if (failed) return json(customer)
      return new Promise<Response>((resolve) => { finish = resolve })
    })
    expect(await screen.findByLabelText('Đang tải hồ sơ khách hàng')).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(typeof finish).toBe('function'))
    // 400 không bị retry ngầm, nên test được chính nút Thử lại.
    failed = true
    finish(json({ detail: 'Không tải được hồ sơ.' }, 400))
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Khách hàng chưa có đơn đặt chỗ')).toBeInTheDocument()
    expect(fetch.mock.calls.filter(([url]) => url.endsWith(customer.id))).toHaveLength(2)
  })

  it.each([customer.id, 'uuid-sai'])('hiện 404 cho hồ sơ %s', async (id) => {
    const { fetch } = open(`/customers/${id}`, () => json({}, 404))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Không tìm thấy khách hàng' })).toHaveFocus())
    expect(fetch.mock.calls.some(([url]) => url.includes('/admin/customers/'))).toBe(id === customer.id)
  })
})
