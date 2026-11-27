import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import type {
  AdminDepartureResponse, AdminDestinationResponse, AdminTourDetailResponse, AdminTourPageResponse,
} from '@/lib/api/generated/model'

const staff = { id: 'staff-id', fullName: 'Minh Anh', email: 'staff@gotrips.test', roles: ['STAFF'] }

const daLat: AdminDestinationResponse = {
  id: 1, slug: 'da-lat', name: 'Đà Lạt', region: 'Tây Nguyên',
  imageUrl: 'https://images.unsplash.com/photo-1', imageAlt: 'Đồi', tourCount: 2, hotelCount: 1,
}

const tour: AdminTourDetailResponse = {
  id: 5, slug: 'da-lat-san-may', title: 'Đà Lạt săn mây', destinationId: 1, destinationName: 'Đà Lạt',
  durationDays: 3, durationNights: 2, departureCity: 'Hà Nội', shortDescription: 'Mô tả',
  coverImageUrl: 'https://images.unsplash.com/photo-2', coverImageAlt: 'Rừng', featured: false, status: 'ACTIVE',
  rating: 4.5, reviewCount: 12, openDepartureCount: 1,
}

function summary(change: Partial<AdminTourPageResponse['items'][number]>): AdminTourPageResponse['items'][number] {
  return {
    id: 5, slug: tour.slug, title: tour.title, destinationId: 1, destinationName: 'Đà Lạt', durationDays: 3,
    durationNights: 2, coverImageUrl: tour.coverImageUrl, coverImageAlt: 'Rừng', featured: false, status: 'ACTIVE',
    upcomingDepartureCount: 1, nextDepartureDate: '2027-01-14', remainingSeats: 8, ...change,
  }
}

function departure(change: Partial<AdminDepartureResponse>): AdminDepartureResponse {
  return {
    id: 1, tourId: 5, departureDate: '2027-01-14', price: 3_490_000, originalPrice: null, discountPercent: null,
    totalSeats: 20, bookedSeats: 0, remainingSeats: 20, state: 'UPCOMING', editable: true, dateEditable: true,
    deletable: true, ...change,
  }
}

function json(status: number, body?: unknown) {
  return status === 204
    ? new Response(null, { status })
    : new Response(JSON.stringify(body ?? {}), { status, headers: { 'Content-Type': 'application/json' } })
}

type Handler = (body: unknown) => Response

/** Giả API theo "METHOD /đường-dẫn" (bỏ truy vấn); `me` luôn là nhân viên. Trả danh sách lời gọi đã nhận. */
function fakeApi(routes: Record<string, Handler>) {
  const calls: { key: string; url: string; body: unknown }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '').split('?')[0]}`
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ key, url, body })
    if (key === 'GET /admin/auth/me') return json(200, staff)
    if (key === 'GET /admin/bookings') return json(200, { items: [], page: 1, size: 1, totalItems: 0, totalPages: 1 })
    return routes[key]?.(body) ?? json(404, { detail: `Chưa giả ${key}` })
  }))
  return calls
}

function open(path: string) {
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(
    <QueryClientProvider client={client}><RouterProvider router={router} /><Toaster /></QueryClientProvider>,
  )
  return router
}

// Router nạp trang bằng lazy import. Lần đầu Vitest phải dịch cả cây module nên lâu hơn thời gian chờ mặc định.
beforeAll(async () => {
  await Promise.all([
    import('./tour-list-page'), import('./tour-new-page'), import('./tour-edit-page'),
    import('@/features/destinations/destination-list-page'),
  ])
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('danh sách tour', () => {
  const page = (items: AdminTourPageResponse['items']) =>
    () => json(200, { items, page: 1, size: 20, totalItems: items.length, totalPages: 1 })

  it.each([
    ['ACTIVE', ['Sửa', 'Ẩn tour', 'Xem trên website', 'Xoá'], ['Hiện tour', 'Khôi phục']],
    ['HIDDEN', ['Sửa', 'Hiện tour', 'Xoá'], ['Ẩn tour', 'Xem trên website', 'Khôi phục']],
    ['DELETED', ['Xem chi tiết', 'Khôi phục'], ['Sửa', 'Ẩn tour', 'Hiện tour', 'Xoá', 'Xem trên website']],
  ] as const)('menu của tour %s chỉ có thao tác hợp lệ', async (status, present, absent) => {
    fakeApi({ 'GET /admin/tours': page([summary({ status })]), 'GET /admin/destinations': () => json(200, [daLat]) })
    open('/tours')

    await userEvent.setup().click(await screen.findByRole('button', { name: `Thao tác tour ${tour.title}` }))

    const menu = await screen.findByRole('menu')
    for (const name of present) expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument()
    for (const name of absent) expect(within(menu).queryByRole('menuitem', { name })).not.toBeInTheDocument()
    if (status === 'ACTIVE') {
      expect(within(menu).getByRole('menuitem', { name: 'Xem trên website' }))
        .toHaveAttribute('href', `http://localhost:3000/tours/${tour.slug}`)
    }
  })

  it('gửi bộ lọc trên URL cho API và hiện thời lượng, chỗ còn', async () => {
    const calls = fakeApi({
      'GET /admin/tours': page([summary({})]), 'GET /admin/destinations': () => json(200, [daLat]),
    })
    open('/tours?status=HIDDEN&featured=true&destinationId=1')

    expect(await screen.findByText('3N2Đ')).toBeInTheDocument()
    expect(screen.getByText('Gần nhất 14/01/2027')).toBeInTheDocument()
    const request = calls.find((call) => call.key === 'GET /admin/tours')
    const params = new URL(request!.url, 'http://x').searchParams
    expect(Object.fromEntries(params)).toEqual({
      status: 'HIDDEN', featured: 'true', destinationId: '1', page: '1', size: '20', sort: 'NEWEST',
    })
  })

  it('hỏi lại trước khi xoá mềm', async () => {
    const calls = fakeApi({
      'GET /admin/tours': page([summary({})]), 'GET /admin/destinations': () => json(200, [daLat]),
      'DELETE /admin/tours/5': () => json(204),
    })
    open('/tours')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: `Thao tác tour ${tour.title}` }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xoá' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Đơn đã đặt vẫn giữ nguyên')
    expect(calls.some((call) => call.key === 'DELETE /admin/tours/5')).toBe(false)

    await user.click(within(dialog).getByRole('button', { name: 'Xoá tour' }))
    expect(await screen.findByText('Đã xoá tour')).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'DELETE /admin/tours/5')).toBe(true)
  })
})

describe('tạo và sửa tour', () => {
  const editRoutes = {
    'GET /admin/tours/5': () => json(200, tour),
    'GET /admin/destinations': () => json(200, [daLat]),
    'GET /admin/tours/5/departures': () => json(200, []),
  }

  async function fillNewTour(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText('Tên tour'), 'Đà Lạt săn mây')
    await user.click(screen.getByRole('combobox', { name: 'Điểm đến' }))
    await user.type(await screen.findByRole('combobox', { name: 'Tìm điểm đến' }), 'da lat')
    await user.click(await screen.findByRole('option', { name: /Đà Lạt/ }))
    await user.type(screen.getByLabelText('Số ngày'), '3')
    await user.type(screen.getByLabelText('Số đêm'), '2')
    await user.type(screen.getByLabelText('Nơi khởi hành'), 'Hà Nội')
    await user.type(screen.getByLabelText('Giới thiệu ngắn'), 'Mô tả')
    await user.type(screen.getByLabelText('Địa chỉ ảnh bìa'), 'https://images.unsplash.com/photo-2')
    await user.type(screen.getByLabelText('Mô tả ảnh'), 'Rừng')
  }

  it('tự sinh slug, tìm điểm đến không dấu, tạo xong mở tab lịch khởi hành mà không bị chặn rời trang', async () => {
    const calls = fakeApi({ ...editRoutes, 'POST /admin/tours': () => json(201, tour) })
    const router = open('/tours/new')
    const user = userEvent.setup()
    await fillNewTour(user)
    expect(screen.getByLabelText('Slug')).toHaveValue('da-lat-san-may')

    await user.click(screen.getByRole('button', { name: 'Tạo tour' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/tours/5'))
    expect(router.state.location.search).toBe('?tab=departures')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /admin/tours')?.body).toMatchObject({
      slug: 'da-lat-san-may', destinationId: 1, durationDays: 3, durationNights: 2, status: 'ACTIVE', featured: false,
    })
  })

  it('gắn lỗi trùng slug của API vào đúng ô và focus ô đó', async () => {
    fakeApi({
      ...editRoutes,
      'POST /admin/tours': () => json(409, {
        detail: 'Slug này đã được dùng.', errors: [{ field: 'slug', message: 'Slug này đã được dùng.' }],
      }),
    })
    const router = open('/tours/new')
    const user = userEvent.setup()
    await fillNewTour(user)

    await user.click(screen.getByRole('button', { name: 'Tạo tour' }))

    expect(await screen.findByText('Slug này đã được dùng.')).toBeInTheDocument()
    expect(screen.getByLabelText('Slug')).toHaveFocus()
    expect(router.state.location.pathname).toBe('/tours/new')
  })

  it('cảnh báo khi đổi slug, giữ nội dung khi chuyển tab và chặn rời trang khi chưa lưu', async () => {
    const calls = fakeApi(editRoutes)
    const router = open('/tours/5')
    const user = userEvent.setup()
    const slug = await screen.findByLabelText('Slug')
    expect(screen.queryByText(/liên kết cũ/)).not.toBeInTheDocument()
    await user.type(slug, '-moi')
    expect(screen.getByText(/liên kết cũ tới tour này/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Lịch khởi hành' }))
    await screen.findByText('Tour chưa có chuyến khởi hành nào')
    await user.click(screen.getByRole('tab', { name: 'Thông tin' }))
    expect(screen.getByLabelText('Slug')).toHaveValue('da-lat-san-may-moi')

    await user.click(screen.getByRole('link', { name: 'Điểm đến' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Rời trang khi chưa lưu?')
    expect(router.state.location.pathname).toBe('/tours/5')
    await user.click(within(dialog).getByRole('button', { name: 'Rời trang' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/destinations'))
    expect(calls.some((call) => call.key.startsWith('PUT'))).toBe(false)
  })

  it('tour đã xoá chỉ xem, có nút khôi phục', async () => {
    fakeApi({ ...editRoutes, 'GET /admin/tours/5': () => json(200, { ...tour, status: 'DELETED' }) })
    open('/tours/5')

    expect(await screen.findByRole('button', { name: 'Khôi phục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên tour')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem trên website' })).not.toBeInTheDocument()
  })

  it('cảnh báo tour đang hiện mà không còn chuyến mở bán', async () => {
    fakeApi({ ...editRoutes, 'GET /admin/tours/5': () => json(200, { ...tour, openDepartureCount: 0 }) })
    open('/tours/5')

    expect(await screen.findByText(/không còn chuyến nào mở bán/)).toBeInTheDocument()
  })

  it('id không phải số thì báo không tìm thấy mà không gọi API tour', async () => {
    const calls = fakeApi(editRoutes)
    open('/tours/..%2Fdestinations')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy tour' })).toBeInTheDocument()
    expect(calls.some((call) => call.key.startsWith('GET /admin/tours'))).toBe(false)
  })
})

describe('lịch khởi hành', () => {
  const routes = (departures: AdminDepartureResponse[]) => ({
    'GET /admin/tours/5': () => json(200, tour),
    'GET /admin/destinations': () => json(200, [daLat]),
    'GET /admin/tours/5/departures': () => json(200, departures),
  })

  it('ẩn chuyến đã qua cho tới khi bật công tắc', async () => {
    fakeApi(routes([
      departure({ id: 1, departureDate: '2026-01-02', state: 'PAST', editable: false, dateEditable: false }),
      departure({ id: 2, departureDate: '2027-01-14' }),
    ]))
    open('/tours/5?tab=departures')

    expect(await screen.findByRole('button', { name: '14/01/2027' })).toBeInTheDocument()
    expect(screen.queryByText('02/01/2026')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Hiện chuyến đã qua' }))
    expect(screen.getByText('02/01/2026')).toBeInTheDocument()
  })

  it.each([
    [{}, ['Sửa', 'Đóng bán', 'Xoá'], ['Mở bán lại']],
    [{ state: 'CLOSED' as const }, ['Sửa', 'Mở bán lại', 'Xoá'], ['Đóng bán']],
    [{ bookedSeats: 3, dateEditable: false, deletable: false }, ['Sửa', 'Đóng bán'], ['Xoá', 'Mở bán lại']],
  ])('menu chuyến theo cờ của API %o', async (change, present, absent) => {
    fakeApi(routes([departure(change)]))
    open('/tours/5?tab=departures')

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Thao tác chuyến 14/01/2027' }))

    const menu = await screen.findByRole('menu')
    for (const name of present) expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument()
    for (const name of absent) expect(within(menu).queryByRole('menuitem', { name })).not.toBeInTheDocument()
  })

  it('lịch thêm chuyến chặn hôm nay và ngày trước đó theo giờ Việt Nam, ghi rõ đổi giá không ảnh hưởng đơn cũ', async () => {
    // 01:30 ngày 25/11 giờ Việt Nam (theo UTC vẫn là 24/11). Chỉ giả đồng hồ, giữ timer thật cho userEvent.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T18:30:00Z'))
    fakeApi(routes([]))
    open('/tours/5?tab=departures')
    const user = userEvent.setup()

    await user.click((await screen.findAllByRole('button', { name: 'Thêm chuyến' }))[0])
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Đổi giá không ảnh hưởng các đơn đã đặt.')
    await user.click(within(dialog).getByRole('button', { name: 'Ngày khởi hành' }))

    const day = (date: string) => {
      const button = document.querySelector<HTMLButtonElement>(`[data-day="${date}"]`)
      expect(button, date).not.toBeNull()
      return button!
    }
    await screen.findByRole('grid')
    expect(day('24/11/2026')).toBeDisabled()
    expect(day('25/11/2026')).toBeDisabled()
    expect(day('26/11/2026')).toBeEnabled()
  })

  it('khoá ngày của chuyến đã có khách và gắn lỗi tổng chỗ của API vào đúng ô', async () => {
    fakeApi({
      ...routes([departure({ bookedSeats: 6, remainingSeats: 14, dateEditable: false, deletable: false })]),
      'PUT /admin/departures/1': () => json(409, {
        detail: 'Tổng chỗ không được thấp hơn số chỗ đã đặt (7).',
        errors: [{ field: 'totalSeats', message: 'Tổng chỗ không được thấp hơn số chỗ đã đặt (7).' }],
      }),
    })
    open('/tours/5?tab=departures')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '14/01/2027' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Ngày khởi hành' })).toBeDisabled()
    const seats = within(dialog).getByLabelText('Tổng số chỗ')
    await user.clear(seats)
    await user.type(seats, '6')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chuyến' }))

    expect(await within(dialog).findByText('Tổng chỗ không được thấp hơn số chỗ đã đặt (7).')).toBeInTheDocument()
    expect(seats).toHaveFocus()
  })
})

describe('điểm đến', () => {
  it('giải thích vì sao không xoá được khi API trả 409', async () => {
    const message = 'Không xoá được điểm đến này vì còn 2 tour và 1 khách sạn đang dùng (kể cả bản đã ẩn hoặc đã xoá).'
    fakeApi({
      'GET /admin/destinations': () => json(200, [daLat]),
      'DELETE /admin/destinations/1': () => json(409, { detail: message }),
    })
    open('/destinations')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Thao tác điểm đến Đà Lạt' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xoá' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá điểm đến' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('tự sinh slug theo tên, gợi ý vùng đã có và gắn lỗi ảnh của API vào đúng ô', async () => {
    const calls = fakeApi({
      'GET /admin/destinations': () => json(200, [daLat]),
      'POST /admin/destinations': () => json(400, { errors: [{ field: 'imageUrl', message: 'Ảnh không được phép.' }] }),
    })
    open('/destinations')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Thêm điểm đến' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Tên điểm đến'), 'Phú Yên')
    expect(within(dialog).getByLabelText('Slug')).toHaveValue('phu-yen')
    const region = within(dialog).getByLabelText('Vùng')
    const options = document.getElementById(region.getAttribute('list')!)!.querySelectorAll('option')
    expect([...options].map((option) => option.value)).toEqual(['Tây Nguyên'])
    await user.type(region, 'Miền Trung')
    await user.type(within(dialog).getByLabelText('Địa chỉ ảnh'), 'https://xau.com/a.jpg')
    await user.type(within(dialog).getByLabelText('Mô tả ảnh'), 'Biển')
    await user.click(within(dialog).getByRole('button', { name: 'Thêm điểm đến' }))

    expect(await within(dialog).findByText('Ảnh không được phép.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Địa chỉ ảnh')).toHaveFocus()
    expect(calls.find((call) => call.key === 'POST /admin/destinations')?.body).toMatchObject({ slug: 'phu-yen' })
  })
})
