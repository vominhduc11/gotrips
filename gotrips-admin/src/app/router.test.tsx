import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { requireAdmin } from '@/app/route-guards'
import { createAdminRoutes } from '@/app/router'
import { RouteError } from '@/components/common/route-error'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

const staff = { id: 'staff-id', fullName: 'Minh Anh', email: 'staff@gotrips.test', roles: ['STAFF'] }

function renderRoute(path: string) {
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return router
}

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function staffResponse(path: string) {
  if (path.includes('/admin/dashboard')) return new Promise<Response>(() => {})
  if (path.includes('/admin/bookings')) return response(200, { items: [], totalItems: 0 })
  return response(200, staff)
}

afterEach(() => vi.unstubAllGlobals())

describe('Trang quản trị', () => {
  it('render khung và chào theo tên tài khoản', async () => {
    vi.stubGlobal('fetch', vi.fn(async (path: string) => staffResponse(path)))
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toHaveFocus()
    expect(screen.getByText('Xin chào, Minh Anh.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bỏ qua đến nội dung chính' })).toHaveAttribute('href', '#noi-dung-chinh')
  })

  it('chuyển sang đăng nhập và giữ đường dẫn khi chưa có phiên', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(401)))
    const router = renderRoute('/?tab=home')
    expect(await screen.findByRole('heading', { name: 'GoTrips Admin' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/?tab=home')
  })

  it('quay lại URL nội bộ sau khi đăng nhập', async () => {
    let signedIn = false
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      if (path.endsWith('/login')) signedIn = true
      return signedIn ? staffResponse(path) : response(401)
    }))
    const router = renderRoute('/login?next=%2F%3Ftab%3Dhome')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), staff.email)
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'matkhau123{Enter}')
    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?tab=home')
  })

  it.each([
    [401, {}, 'Email hoặc mật khẩu không đúng.'],
    [403, { detail: 'Tài khoản không có quyền truy cập trang quản trị' }, 'Tài khoản không có quyền truy cập trang quản trị'],
    [400, { errors: [{ field: 'email', message: 'Email chưa hợp lệ.' }] }, 'Email chưa hợp lệ.'],
  ])('hiện đúng lỗi đăng nhập %s và giữ người dùng ở form', async (status, body, expected) => {
    vi.stubGlobal('fetch', vi.fn(async (path: string) =>
      path.endsWith('/login') ? response(status, body) : response(401)))
    const router = renderRoute('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), staff.email)
    await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'matkhau123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(router.state.location.pathname).toBe('/login')
    if (status === 400) expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  it('báo thu hồi quyền và cho phép đăng nhập lại', async () => {
    let signedOut = false
    vi.stubGlobal('fetch', vi.fn(async (path: string) => {
      if (path.endsWith('/logout')) {
        signedOut = true
        return new Response(null, { status: 204 })
      }
      return response(signedOut ? 401 : 403)
    }))
    const router = renderRoute('/')
    expect(await screen.findByRole('status')).toHaveTextContent('Tài khoản không còn quyền truy cập.')
    expect(router.state.location.pathname).toBe('/login')
    expect(signedOut).toBe(true)
  })

  it('hiện trang 403 khi STAFF mở route dành cho ADMIN', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(200, staff)))
    const client = createAppQueryClient()
    const router = createMemoryRouter([{
      path: '/staff', loader: requireAdmin(client), element: <p>Nhân viên</p>, errorElement: <RouteError />,
      hydrateFallbackElement: <p>Đang tải</p>,
    }], { initialEntries: ['/staff'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền' })).toBeInTheDocument()
  })

  it.each([false, true])('lọc mục Nhân viên theo quyền ADMIN (%s)', (isAdmin) => {
    const router = createMemoryRouter([{
      path: '/', element: <SidebarProvider><AppSidebar isAdmin={isAdmin} items={[
        { to: '/', label: 'Tổng quan' },
        { to: '/staff', label: 'Nhân viên', adminOnly: true },
      ]} /></SidebarProvider>,
    }])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('link', { name: 'Tổng quan' })).toBeInTheDocument()
    expect(Boolean(screen.queryByRole('link', { name: 'Nhân viên' }))).toBe(isAdmin)
  })

  it('hiện trang 404 khi đường dẫn không tồn tại', () => {
    renderRoute('/khong-ton-tai')
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })
})
