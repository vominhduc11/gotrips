import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import type {
  AdminAmenityResponse, AdminDestinationResponse, AdminHotelDetailResponse, AdminHotelSummaryResponse,
  AdminRoomTypeResponse,
} from '@/lib/api/generated/model'
import { NO_ROOM_TYPE_WARNING, NO_SELLING_ROOM_TYPE_WARNING } from './hotel-visibility'

const staff = { id: 'staff-id', fullName: 'Minh Anh', email: 'staff@gotrips.test', roles: ['STAFF'] }
const photo = (name: string) => `https://images.unsplash.com/photo-${name}`

const daLat: AdminDestinationResponse = {
  id: 1, slug: 'da-lat', name: 'Đà Lạt', region: 'Tây Nguyên',
  imageUrl: photo('dest'), imageAlt: 'Đồi', tourCount: 2, hotelCount: 1,
}

const amenities: AdminAmenityResponse[] = [
  { code: 'pool', name: 'Hồ bơi', scope: 'HOTEL' },
  { code: 'wifi', name: 'Wi-Fi', scope: 'BOTH' },
  { code: 'tv', name: 'TV', scope: 'ROOM' },
]

const hotel: AdminHotelDetailResponse = {
  id: 7, slug: 'doi-thong', name: 'Đồi Thông', destinationId: 1, destinationName: 'Đà Lạt', starRating: 4,
  area: 'Phường 3', imageUrl: photo('main'), imageAlt: 'Mặt tiền', description: 'Giới thiệu',
  amenities: [{ code: 'pool', name: 'Hồ bơi' }],
  images: [{ url: photo('a'), alt: 'Sảnh' }, { url: photo('b'), alt: 'Vườn' }],
  checkInTime: '14:00', checkOutTime: '12:00', status: 'ACTIVE', rating: 4.5, reviewCount: 12, roomTypeCount: 1, sellingRoomTypeCount: 1,
  minPricePerNight: 900_000, visibleOnWebsite: true,
}

function summary(change: Partial<AdminHotelSummaryResponse>): AdminHotelSummaryResponse {
  return {
    id: 7, slug: 'doi-thong', name: 'Đồi Thông', destinationId: 1, destinationName: 'Đà Lạt', starRating: 4,
    area: 'Phường 3', imageUrl: photo('main'), imageAlt: 'Mặt tiền', status: 'ACTIVE', roomTypeCount: 1, sellingRoomTypeCount: 1,
    minPricePerNight: 900_000, visibleOnWebsite: true, ...change,
  }
}

function roomType(change: Partial<AdminRoomTypeResponse>): AdminRoomTypeResponse {
  return {
    id: 11, hotelId: 7, name: 'Phòng Deluxe', pricePerNight: 900_000, maxGuests: 2, bedType: '1 giường đôi',
    areaM2: 24, totalRooms: 5, amenities: [], images: [], minimumTotalRooms: 0, deletable: true, ...change,
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
  const defaults: Record<string, Handler> = {
    'GET /admin/auth/me': () => json(200, staff),
    'GET /admin/bookings': () => json(200, { items: [], page: 1, size: 1, totalItems: 0, totalPages: 1 }),
    'GET /admin/destinations': () => json(200, [daLat]),
    'GET /admin/amenities': () => json(200, amenities),
  }
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '').split('?')[0]}`
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ key, url, body })
    return (routes[key] ?? defaults[key])?.(body) ?? json(404, { detail: `Chưa giả ${key}` })
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

const list = (items: AdminHotelSummaryResponse[]) => () =>
  json(200, { items, page: 1, size: 20, totalItems: items.length, totalPages: 1 })

const editRoutes = (change: Partial<AdminHotelDetailResponse> = {}, rooms = [roomType({})]) => ({
  'GET /admin/hotels/7': () => json(200, { ...hotel, ...change }),
  'GET /admin/hotels/7/room-types': () => json(200, rooms),
})

// Router nạp trang bằng lazy import. Lần đầu Vitest phải dịch cả cây module nên lâu hơn thời gian chờ mặc định.
beforeAll(async () => {
  await Promise.all([
    import('./hotel-list-page'), import('./hotel-new-page'), import('./hotel-edit-page'),
    import('@/features/destinations/destination-list-page'),
  ])
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('danh sách khách sạn', () => {
  it('cảnh báo khách sạn đang hiện chưa có loại phòng và chỉ cho xem trên website khi API báo đang hiện', async () => {
    fakeApi({
      'GET /admin/hotels': list([
        summary({ id: 1, name: 'Chưa có phòng', roomTypeCount: 0, sellingRoomTypeCount: 0, minPricePerNight: null, visibleOnWebsite: false }),
        summary({ id: 2, name: 'Đủ phòng' }),
        summary({
          id: 3, name: 'Đang ẩn', status: 'HIDDEN', roomTypeCount: 0, sellingRoomTypeCount: 0, minPricePerNight: null, visibleOnWebsite: false,
        }),
      ]),
    })
    open('/hotels')
    const user = userEvent.setup()

    const waiting = (await screen.findByRole('link', { name: 'Chưa có phòng' })).closest('tr')!
    expect(within(waiting).getByText(NO_ROOM_TYPE_WARNING)).toBeInTheDocument()
    expect(within(waiting).getByText('—')).toBeInTheDocument()
    // Khách sạn đang ẩn không cần cảnh báo này.
    expect(screen.getAllByText(NO_ROOM_TYPE_WARNING)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Thao tác khách sạn Chưa có phòng' }))
    expect(within(await screen.findByRole('menu')).queryByRole('menuitem', { name: 'Xem trên website' }))
      .not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Thao tác khách sạn Đủ phòng' }))
    expect(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Xem trên website' }))
      .toHaveAttribute('href', 'http://localhost:3000/hotels/doi-thong')
  })

  it('đọc bộ lọc từ URL và gửi đúng cho API', async () => {
    const calls = fakeApi({ 'GET /admin/hotels': list([]) })
    open('/hotels?destinationId=1&status=DELETED&q=doi&sort=NAME_ASC')

    expect(await screen.findByText('Không tìm thấy khách sạn phù hợp')).toBeInTheDocument()
    const url = calls.find((call) => call.key === 'GET /admin/hotels')!.url
    expect(url).toContain('destinationId=1')
    expect(url).toContain('status=DELETED')
    expect(url).toContain('q=doi')
    expect(url).toContain('sort=NAME_ASC')
  })

  it('báo lỗi tải và thử lại được', async () => {
    let fail = true
    fakeApi({ 'GET /admin/hotels': () => (fail ? json(500) : list([summary({})])()) })
    open('/hotels')

    const retry = await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 5000 })
    fail = false
    await userEvent.setup().click(retry)

    expect(await screen.findByRole('link', { name: 'Đồi Thông' })).toBeInTheDocument()
  })

  it('số khách sạn ở trang điểm đến dẫn tới danh sách đã lọc', async () => {
    fakeApi({ 'GET /admin/hotels': list([]) })
    const router = open('/destinations')

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Xem khách sạn ở Đà Lạt (1)' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/hotels'))
    expect(router.state.location.search).toBe('?destinationId=1')
  })
})

describe('form khách sạn', () => {
  /** Dán thay vì gõ từng ký tự: địa chỉ ảnh dài làm test chậm. */
  async function paste(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
    await user.click(screen.getByLabelText(label))
    await user.paste(value)
  }

  async function fillNewHotel(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText('Tên khách sạn'), 'Đồi Thông')
    await user.click(screen.getByRole('combobox', { name: 'Điểm đến' }))
    await user.click(await screen.findByRole('option', { name: /Đà Lạt/ }))
    // Radix Select cần API con trỏ mà jsdom không có: chọn bằng bàn phím.
    screen.getByRole('combobox', { name: 'Hạng sao' }).focus()
    await user.keyboard('{Enter}')
    ;(await screen.findByRole('option', { name: '4 sao' })).focus()
    await user.keyboard('{Enter}')
    await paste(user, 'Khu vực', 'Phường 3')
    await paste(user, 'Giới thiệu', 'Mô tả')
    await paste(user, 'Địa chỉ ảnh đại diện', photo('main'))
    await paste(user, 'Mô tả ảnh đại diện', 'Mặt tiền')
  }

  async function addImage(user: ReturnType<typeof userEvent.setup>, number: number, name: string) {
    await user.click(screen.getByRole('button', { name: 'Thêm ảnh' }))
    await paste(user, `Địa chỉ ảnh ${number}`, photo(name))
    await paste(user, `Mô tả ảnh ${number}`, `Ảnh ${name}`)
  }

  it('chỉ hiện tiện ích dùng được cho khách sạn; đổi thứ tự ảnh bằng bàn phím và gửi đúng thứ tự', async () => {
    const calls = fakeApi({ ...editRoutes(), 'POST /admin/hotels': () => json(201, hotel) })
    const router = open('/hotels/new')
    const user = userEvent.setup()
    await fillNewHotel(user)
    expect(screen.getByLabelText('Slug')).toHaveValue('doi-thong')
    expect(await screen.findByRole('checkbox', { name: 'Hồ bơi' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'TV' })).not.toBeInTheDocument()
    // Chọn ngược thứ tự danh mục: request vẫn theo thứ tự danh mục.
    await user.click(screen.getByRole('checkbox', { name: 'Wi-Fi' }))
    await user.click(screen.getByRole('checkbox', { name: 'Hồ bơi' }))
    await addImage(user, 1, 'a')
    await addImage(user, 2, 'b')

    const up = screen.getByRole('button', { name: 'Đưa ảnh 2 lên' })
    up.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByLabelText('Địa chỉ ảnh 1')).toHaveValue(photo('b'))
    // Tới đầu danh sách thì nút lên bị khoá, focus chuyển sang nút xuống của chính ảnh đó.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đưa ảnh 1 xuống' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Tạo khách sạn' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/hotels/7'))
    expect(router.state.location.search).toBe('?tab=rooms')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(calls.find((call) => call.key === 'POST /admin/hotels')?.body).toEqual({
      name: 'Đồi Thông', slug: 'doi-thong', destinationId: 1, starRating: 4, area: 'Phường 3', description: 'Mô tả',
      amenityCodes: ['pool', 'wifi'], checkInTime: '14:00', checkOutTime: '12:00', imageUrl: photo('main'),
      imageAlt: 'Mặt tiền', status: 'ACTIVE',
      images: [{ url: photo('b'), alt: 'Ảnh b' }, { url: photo('a'), alt: 'Ảnh a' }],
    })
  })

  it('gắn lỗi ảnh thứ hai của API vào đúng ô và focus ô đó', async () => {
    const message = 'Ảnh phải là địa chỉ https từ nguồn được phép.'
    fakeApi({
      ...editRoutes(),
      'PUT /admin/hotels/7': () => json(400, {
        detail: 'Dữ liệu gửi lên không hợp lệ', errors: [{ field: 'images[1].url', message }],
      }),
    })
    open('/hotels/7')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Khu vực'), ' mới')

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('Địa chỉ ảnh 2')).toHaveFocus()
    expect(screen.queryByText('Dữ liệu gửi lên không hợp lệ')).not.toBeInTheDocument()
  })

  it('kiểm giờ nhận phòng trước khi gửi', async () => {
    const calls = fakeApi(editRoutes())
    open('/hotels/7')
    const checkIn = await screen.findByLabelText('Giờ nhận phòng')
    fireEvent.change(checkIn, { target: { value: '' } })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Vui lòng nhập giờ nhận phòng.')).toBeInTheDocument()
    expect(calls.some((call) => call.key === 'PUT /admin/hotels/7')).toBe(false)
  })

  it('giữ nội dung đang nhập khi chuyển tab và chặn rời trang khi chưa lưu', async () => {
    fakeApi(editRoutes())
    const router = open('/hotels/7')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Slug'), '-moi')
    expect(screen.getByText(/liên kết cũ tới khách sạn này/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Loại phòng' }))
    await screen.findByRole('button', { name: 'Phòng Deluxe' })
    await user.click(screen.getByRole('tab', { name: 'Thông tin' }))
    expect(screen.getByLabelText('Slug')).toHaveValue('doi-thong-moi')

    await user.click(screen.getByRole('link', { name: 'Điểm đến' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Rời trang khi chưa lưu?')
    expect(router.state.location.pathname).toBe('/hotels/7')
  })

  it('khách sạn đang hiện chưa có loại phòng: có cảnh báo và nút mở tab loại phòng', async () => {
    fakeApi(editRoutes({ roomTypeCount: 0, sellingRoomTypeCount: 0, minPricePerNight: null, visibleOnWebsite: false }, []))
    const router = open('/hotels/7')

    expect(await screen.findByText(NO_ROOM_TYPE_WARNING)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem trên website' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mở Loại phòng' }))

    expect(router.state.location.search).toBe('?tab=rooms')
    expect(await screen.findByText('Khách sạn chưa có loại phòng nào')).toBeInTheDocument()
  })

  it('khách sạn đã xoá chỉ xem, có nút khôi phục, tab loại phòng không có thao tác', async () => {
    fakeApi(editRoutes({ status: 'DELETED', visibleOnWebsite: false }, [roomType({ deletable: false })]))
    open('/hotels/7')

    expect(await screen.findByRole('button', { name: 'Khôi phục' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tên khách sạn')).toBeDisabled()
    expect(await screen.findByRole('checkbox', { name: 'Hồ bơi' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Loại phòng' }))
    expect(await screen.findByText('Phòng Deluxe')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm loại phòng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thao tác loại phòng Phòng Deluxe' })).not.toBeInTheDocument()
  })

  it.each(['/hotels/..%2Fdestinations', '/hotels/999'])('%s báo không tìm thấy', async (path) => {
    const calls = fakeApi({})
    open(path)

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy khách sạn' })).toBeInTheDocument()
    const hotelCalls = calls.filter((call) => call.key.startsWith('GET /admin/hotels'))
    expect(hotelCalls.map((call) => call.key)).toEqual(path.endsWith('999') ? ['GET /admin/hotels/999'] : [])
  })

  it('API báo 403 thì hiện lỗi quyền kèm nút thử lại', async () => {
    fakeApi({ 'GET /admin/hotels/7': () => json(403) })
    open('/hotels/7')

    expect(await screen.findByText('Bạn không có quyền thực hiện thao tác này.')).toBeInTheDocument()
  })
})

describe('loại phòng', () => {
  it('gắn lỗi giảm số phòng của API vào ô tổng số phòng và focus ô đó', async () => {
    const message = 'Không giảm được: có đêm đang giữ 3 phòng. Tổng số phòng tối thiểu là 3.'
    const calls = fakeApi({
      ...editRoutes({}, [roomType({ minimumTotalRooms: 3, deletable: false })]),
      'PUT /admin/room-types/11': () => json(409, { detail: message, errors: [{ field: 'totalRooms', message }] }),
    })
    open('/hotels/7?tab=rooms')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Phòng Deluxe' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Có đêm đang giữ 3 phòng nên không giảm thấp hơn 3.')
    expect(await within(dialog).findByRole('checkbox', { name: 'TV' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: 'Hồ bơi' })).not.toBeInTheDocument()
    const total = within(dialog).getByLabelText('Tổng số phòng')
    await user.clear(total)
    await user.type(total, '2')

    await user.click(within(dialog).getByRole('button', { name: 'Lưu loại phòng' }))

    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    expect(total).toHaveFocus()
    expect(calls.find((call) => call.key === 'PUT /admin/room-types/11')?.body).toMatchObject({ totalRooms: 2 })
  })

  it('thêm loại phòng kèm tiện ích và ảnh', async () => {
    const calls = fakeApi({
      ...editRoutes({ roomTypeCount: 0, sellingRoomTypeCount: 0, visibleOnWebsite: false }, []),
      'POST /admin/hotels/7/room-types': () => json(201, roomType({})),
    })
    open('/hotels/7?tab=rooms')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Thêm loại phòng' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Tên loại phòng'), 'Phòng Deluxe')
    await user.type(within(dialog).getByLabelText('Giá mỗi phòng một đêm (VND)'), '1.250.000')
    await user.type(within(dialog).getByLabelText('Giường'), '1 giường đôi')
    await user.type(within(dialog).getByLabelText('Diện tích (m²)'), '28')
    await user.type(within(dialog).getByLabelText('Tổng số phòng'), '4')
    await user.click(await within(dialog).findByRole('checkbox', { name: 'TV' }))
    await user.click(within(dialog).getByRole('button', { name: 'Thêm ảnh' }))
    await user.type(within(dialog).getByLabelText('Địa chỉ ảnh 1'), photo('giuong'))
    await user.type(within(dialog).getByLabelText('Mô tả ảnh 1'), 'Giường')

    await user.click(within(dialog).getByRole('button', { name: 'Thêm loại phòng' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls.find((call) => call.key === 'POST /admin/hotels/7/room-types')?.body).toEqual({
      name: 'Phòng Deluxe', pricePerNight: 1_250_000, maxGuests: 2, bedType: '1 giường đôi', areaM2: 28,
      totalRooms: 4, amenityCodes: ['tv'], images: [{ url: photo('giuong'), alt: 'Giường' }],
    })
  })

  it('phân biệt khách sạn có loại phòng nhưng tất cả đã ngừng bán', async () => {
    fakeApi(editRoutes({ roomTypeCount: 1, sellingRoomTypeCount: 0, minPricePerNight: null, visibleOnWebsite: false },
      [roomType({ totalRooms: 0 })]))
    open('/hotels/7?tab=rooms')
    expect(await screen.findByText(NO_SELLING_ROOM_TYPE_WARNING)).toBeInTheDocument()
    expect(await screen.findByText('Ngừng nhận đặt')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem trên website' })).not.toBeInTheDocument()
  })

  it('cảnh báo khi nhập 0 cho loại đang bán cuối cùng dù còn loại phòng ngừng bán', async () => {
    fakeApi(editRoutes({ roomTypeCount: 2 }, [roomType({}), roomType({ id: 12, name: 'Phòng đã ngừng', totalRooms: 0 })]))
    open('/hotels/7?tab=rooms')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Phòng Deluxe' }))
    const total = within(screen.getByRole('dialog')).getByLabelText('Tổng số phòng')
    await user.clear(total)
    await user.type(total, '0')
    expect(screen.getByText('Đây là loại phòng đang bán cuối cùng. Khách sạn sẽ không còn hiện trên website.')).toBeInTheDocument()
  })

  it('cảnh báo khi xoá loại phòng cuối cùng và hiện lý do khi API từ chối', async () => {
    const message = 'Không xoá được loại phòng này vì đã có đơn đặt (kể cả đơn đã huỷ).'
    fakeApi({ ...editRoutes(), 'DELETE /admin/room-types/11': () => json(409, { detail: message }) })
    open('/hotels/7?tab=rooms')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Thao tác loại phòng Phòng Deluxe' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xoá' }))
    const confirm = await screen.findByRole('alertdialog')
    expect(confirm).toHaveTextContent('Đây là loại phòng đang bán cuối cùng. Khách sạn sẽ không còn hiện trên website.')
    await user.click(within(confirm).getByRole('button', { name: 'Xoá loại phòng' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('loại phòng đã có đơn không có thao tác xoá', async () => {
    fakeApi(editRoutes({}, [roomType({ deletable: false, totalRooms: 0 })]))
    open('/hotels/7?tab=rooms')

    expect(await screen.findByText('Ngừng nhận đặt')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thao tác loại phòng Phòng Deluxe' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Xoá' })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Không xoá được vì đã có đơn' }))
      .toHaveAttribute('aria-disabled', 'true')
  })
})
