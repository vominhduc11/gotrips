import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import type { AdminAirportResponse, AdminFlightRouteResponse, AdminFlightScheduleResponse } from '@/lib/api/generated/model'

const airline = { name: 'Sóng Việt', code: 'SV' }
const airports: AdminAirportResponse[] = [
  { code: 'SGN', name: 'Tân Sơn Nhất', city: 'TP. Hồ Chí Minh', sortOrder: 1 },
  { code: 'HAN', name: 'Nội Bài', city: 'Hà Nội', sortOrder: 2 },
  { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng', sortOrder: 3 },
]
const schedule: AdminFlightScheduleResponse = {
  id: 12, flightNumber: 'SV123', airline, from: airports[0], to: airports[1], departTime: '23:30', arriveTime: '01:10',
  arrivesNextDay: true, durationMinutes: 100, economyFare: 1_200_000, economySeats: 5, businessSeats: 2, firstSeats: 0,
  premiumEconomySeats: 1, timingEditable: false, deletable: false,
}
const first: AdminFlightRouteResponse = {
  id: 11, from: airports[0], to: airports[1], durationMinutes: 120, referencePrice: 1_500_000,
  imageUrl: 'https://images.unsplash.com/photo-a', imageAlt: 'Thành phố', sortOrder: 1,
}
const second = { ...first, id: 13, from: airports[2], sortOrder: 2 }

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})
const page = (items: unknown[]) => ({ items, page: 1, size: 20, totalItems: items.length, totalPages: 1 })

function mount(path: string, handlers: Record<string, () => Response> = {}) {
  const defaults: Record<string, () => Response> = {
    'GET /admin/auth/me': () => response(200, { id: 'staff-id', fullName: 'Minh Anh', email: 'staff@gotrips.test', roles: ['STAFF'] }),
    'GET /admin/bookings': () => response(200, page([])),
    'GET /admin/airlines': () => response(200, [airline]),
    'GET /admin/airports': () => response(200, airports),
    'GET /admin/flight-schedules': () => response(200, page([schedule])),
    'GET /admin/flight-schedules/12': () => response(200, schedule),
    'GET /admin/flight-routes': () => response(200, [first, second]),
  }
  const calls: { key: string; search: string; body: unknown }[] = []
  vi.stubGlobal('fetch', vi.fn(async (raw: string, init?: RequestInit) => {
    const url = new URL(raw.replace(/^\/api/, ''), 'http://localhost')
    const key = `${init?.method ?? 'GET'} ${url.pathname}`
    calls.push({ key, search: url.search, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined })
    return (handlers[key] ?? defaults[key])?.() ?? response(404, { detail: 'Không tìm thấy.' })
  }))
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { calls, router }
}

beforeAll(async () => {
  await Promise.all([
    import('./flight-reference-pages'), import('./flight-schedules-page'), import('./flight-routes-page'),
  ])
}, 60_000)

afterEach(() => vi.unstubAllGlobals())

it('hãng bay hiện lỗi quyền và cho thử lại', async () => {
  let failed = false
  mount('/flights/airlines', {
    'GET /admin/airlines': () => {
      if (failed) return response(200, [airline])
      failed = true
      return response(403, {})
    },
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền')
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('button', { name: 'SV' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'SV' }))
  expect(within(screen.getByRole('dialog')).getByLabelText('Mã hãng')).toHaveAttribute('readonly')
})

it('lịch bay đọc bộ lọc từ URL, hiển thị giờ hạ cánh và khoá giờ theo API', async () => {
  const { calls } = mount('/flights/schedules?fromCode=SGN&toCode=HAN&airlineCode=SV&sort=ECONOMY_FARE_DESC', {
    'PUT /admin/flight-schedules/12': () => response(409, {
      detail: 'Hạng ghế đã có đơn.', errors: [{ field: 'economySeats', message: 'Số ghế tối thiểu là 2.' }],
    }),
  })
  const selected = await screen.findByRole('button', { name: 'SV123' })
  expect(screen.getByText('01:10 (+1 ngày)')).toBeInTheDocument()
  const call = calls.find(({ key }) => key === 'GET /admin/flight-schedules')
  expect(Object.fromEntries(new URLSearchParams(call?.search))).toMatchObject({
    fromCode: 'SGN', toCode: 'HAN', airlineCode: 'SV', sort: 'ECONOMY_FARE_DESC',
  })
  await userEvent.click(selected)
  const dialog = within(await screen.findByRole('dialog', { name: 'Sửa lịch bay SV123' }))
  expect(dialog.getByLabelText('Giờ cất cánh')).toHaveAttribute('readonly')
  expect(dialog.getByLabelText('Thời lượng (phút)')).toHaveAttribute('readonly')
  const economySeats = dialog.getByLabelText('Phổ thông', { exact: true })
  await userEvent.clear(economySeats)
  await userEvent.type(economySeats, '1')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu lịch bay' }))
  expect(await dialog.findByText('Số ghế tối thiểu là 2.')).toBeInTheDocument()
  expect(economySeats).toHaveFocus()
  expect(calls.find(({ key }) => key === 'PUT /admin/flight-schedules/12')?.body)
    .toMatchObject({ departTime: '23:30', economySeats: 1 })
})

it('chi tiết lịch đã xoá hiện 404 trong dialog', async () => {
  mount('/flights/schedules', {
    'GET /admin/flight-schedules/12': () => response(404, { detail: 'Không tìm thấy lịch bay này.' }),
  })
  await userEvent.click(await screen.findByRole('button', { name: 'SV123' }))
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Lịch bay này không còn tồn tại.')
})

it('đổi thứ tự chặng bằng bàn phím và gửi cả danh sách, tải lại nếu API báo cũ', async () => {
  let stale = false
  const { calls } = mount('/flights/routes', {
    'GET /admin/flight-routes': () => response(200, stale ? [second, first] : [first, second]),
    'PUT /admin/flight-routes/order': () => {
      stale = true
      return response(409, { detail: 'Danh sách chặng đã thay đổi. Vui lòng tải lại trước khi lưu thứ tự.' })
    },
  })
  const move = await screen.findByRole('button', { name: 'Đưa DAD → HAN lên' })
  move.focus()
  await userEvent.keyboard('[Enter]')
  const table = within(screen.getByRole('table', { name: 'Danh sách chặng bay phổ biến' }))
  expect(table.getAllByRole('row')[1]).toHaveTextContent('DAD → HAN')
  expect(screen.getByRole('button', { name: 'Đưa DAD → HAN lên' })).toHaveFocus()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thứ tự' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Danh sách chặng đã thay đổi')
  expect(calls.find(({ key }) => key === 'PUT /admin/flight-routes/order')?.body)
    .toEqual({ expectedIds: [11, 13], orderedIds: [13, 11] })
  await waitFor(() => expect(calls.filter(({ key }) => key === 'GET /admin/flight-routes').length).toBeGreaterThan(1))
  expect(screen.queryByRole('button', { name: 'Lưu thứ tự' })).not.toBeInTheDocument()
})
