import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { getGetAdminDashboardQueryKey } from '@/lib/api/generated/api'
import type { AdminBookingPageResponse, AdminDashboardResponse } from '@/lib/api/generated/model'
import { refreshTourQueries } from '@/features/tours/use-tour-lifecycle'

vi.mock('./dashboard-charts', () => ({
  DashboardChart: () => null,
}))

const staff = { id: 'staff-id', fullName: 'Minh Anh', email: 'staff@gotrips.test', roles: ['STAFF'] }
const data = {
  from: '2026-11-01', to: '2026-11-01', revenueCollected: 2_490_000, newBookings: 1,
  newBookingsByKind: { tour: 1, hotel: 0, flight: 0 }, awaitingPayment: 1, awaitingConfirmation: 1,
  refundPending: { count: 1, amount: 3_000_000 }, customers: { total: 8, newCustomers: 3 },
  tours: { active: 2, hidden: 1, bookable: 1 },
  daily: [{ date: '2026-11-01', revenueCollected: 2_490_000, newBookings: 1 }],
  upcomingDepartures: [{ id: 1, tourId: 2, tourTitle: 'Tour đồi thông', departureDate: '2026-11-28',
    totalSeats: 10, bookedSeats: 3, state: 'CLOSED' }],
} satisfies AdminDashboardResponse

const tasks = {
  items: [{ code: 'GT222222', kind: 'TOUR', status: 'PENDING', paymentStatus: 'UNPAID', totalAmount: 1,
    createdAt: '2026-11-01T04:00:00Z', contact: { fullName: 'Khách', email: 'a@example.com', phone: '0901' },
    availableActions: [], customerId: 'customer-id' }],
  page: 1, size: 5, totalItems: 1, totalPages: 1,
} satisfies AdminBookingPageResponse

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function open(path = '/', initialDashboardStatus = 200, taskStatus = 200) {
  let dashboardStatus = initialDashboardStatus
  const calls: URL[] = []
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const url = new URL(path, 'http://localhost')
    calls.push(url)
    if (url.pathname.endsWith('/auth/me')) return json(staff)
    if (url.pathname.endsWith('/dashboard')) return json(data, dashboardStatus)
    if (url.pathname.endsWith('/bookings')) {
      if (url.searchParams.get('sort') === 'CREATED_ASC') return json(tasks, taskStatus)
      const pending = url.searchParams.get('status') === 'PENDING'
      return json({ ...tasks, items: [], totalItems: pending && !url.searchParams.has('paymentStatus') ? 2 : 1 })
    }
    return json({}, 404)
  }))
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { calls, router, recover: () => { dashboardStatus = 200 } }
}

beforeAll(async () => {
  await import('@/features/bookings/booking-list-page')
}, 60_000)
afterEach(() => vi.unstubAllGlobals())

describe('Trang Tổng quan', () => {
  it('hiện số liệu, tóm tắt biểu đồ và tải 5 đơn chờ lâu nhất độc lập với khoảng ngày', async () => {
    const { calls } = open('/?range=custom&from=2026-11-01&to=2026-11-01')
    expect(await screen.findByRole('heading', { name: 'Tổng quan', level: 1 })).toHaveFocus()
    const work = within(screen.getByRole('region', { name: 'Việc cần làm' }))
    expect(await work.findByRole('link', { name: 'GT222222' })).toHaveAttribute('href', '/bookings/GT222222')
    expect(screen.getByLabelText('2 đơn chờ xử lý')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Chờ thanh toán 1/ })).toHaveAttribute('href',
      '/bookings?status=PENDING&paymentStatus=UNPAID')
    expect(screen.getByRole('link', { name: /Chờ xác nhận 1/ })).toHaveAttribute('href',
      '/bookings?status=PENDING&paymentStatus=PAID')
    expect(screen.getByText('Không gồm đơn đã huỷ')).toBeInTheDocument()
    expect(screen.getByText('2 đang hiện · 1 đang ẩn')).toBeInTheDocument()
    expect(screen.getByText(/Tổng 2\.490\.000.*Cao nhất.*01\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByText('Tổng 1 đơn · Cao nhất 1 đơn ngày 01/11/2026')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /Tỷ lệ lấp đầy/ })).toHaveAttribute('aria-valuetext', '3 trên 10 chỗ đã đặt')
    expect(screen.getByText('Đã đóng bán')).toBeInTheDocument()
    const queries = calls.filter((url) => url.pathname.endsWith('/bookings'))
    expect(queries.some(({ searchParams }) => searchParams.get('status') === 'PENDING' &&
      searchParams.get('sort') === 'CREATED_ASC' && searchParams.get('size') === '5' &&
      !searchParams.has('createdFrom'))).toBe(true)
    expect(calls.some((url) => url.pathname.endsWith('/dashboard') && url.searchParams.get('from') === '2026-11-01')).toBe(true)
  })

  it('mở danh sách cần hoàn tiền và gỡ riêng được bộ lọc thanh toán', async () => {
    const { router, calls } = open()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: /Xem đơn cần hoàn tiền/ }))
    expect(await screen.findByRole('heading', { name: 'Đơn đặt chỗ', level: 1 })).toHaveFocus()
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument()
    const current = () => new URLSearchParams(router.state.location.search)
    expect(current().get('status')).toBe('CANCELLED')
    expect(current().get('paymentStatus')).toBe('PAID')
    expect(calls.some(({ searchParams }) => searchParams.get('status') === 'CANCELLED' &&
      searchParams.get('paymentStatus') === 'PAID')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Gỡ bộ lọc thanh toán' }))
    expect(current().get('status')).toBe('CANCELLED')
    expect(current().has('paymentStatus')).toBe(false)
  })

  it('đổi preset và giữ lựa chọn khi Back/Forward', async () => {
    const { router } = open('/?range=custom&from=2026-11-01&to=2026-11-01')
    const user = userEvent.setup()
    expect(await screen.findByRole('button', { name: 'Tuỳ chọn' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '7 ngày' }))
    expect(router.state.location.search).toBe('?range=7')
    await act(() => router.navigate(-1))
    expect(screen.getByRole('button', { name: 'Tuỳ chọn' })).toHaveAttribute('aria-pressed', 'true')
    await act(() => router.navigate(1))
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('thử tải lại Tổng quan mà vẫn dùng được danh sách việc', async () => {
    const { recover } = open('/', 403)
    const revenue = within(await screen.findByRole('region', { name: 'Doanh thu theo ngày' }))
    expect(await revenue.findByRole('alert')).toHaveTextContent('Bạn không có quyền')
    expect(await screen.findByRole('link', { name: 'GT222222' })).toBeInTheDocument()
    recover()
    await userEvent.setup().click(revenue.getByRole('button', { name: 'Thử lại' }))
    expect(await revenue.findByText(/Tổng 2\.490\.000/)).toBeInTheDocument()
  })

  it('vẫn hiện chỉ số nếu danh sách việc lỗi', async () => {
    open('/', 200, 403)
    const work = within(await screen.findByRole('region', { name: 'Việc cần làm' }))
    expect(await work.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Chờ xác nhận 1/ })).toBeInTheDocument()
  })

  it('làm mới mọi khoảng Tổng quan khi thao tác danh mục', async () => {
    const client = createAppQueryClient()
    const keyA = getGetAdminDashboardQueryKey({ from: '2026-11-01', to: '2026-11-01' })
    const keyB = getGetAdminDashboardQueryKey({ from: '2026-11-02', to: '2026-11-02' })
    client.setQueryData(keyA, data)
    client.setQueryData(keyB, data)
    expect(getGetAdminDashboardQueryKey()).toEqual(['/admin/dashboard'])
    await refreshTourQueries(client, 2)
    await waitFor(() => {
      expect(client.getQueryState(keyA)?.isInvalidated).toBe(true)
      expect(client.getQueryState(keyB)?.isInvalidated).toBe(true)
    })
  })
})
