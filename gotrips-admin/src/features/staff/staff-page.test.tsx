import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { adminMeOptions } from '@/features/auth/session'
import type { AdminStaffResponse } from '@/lib/api/generated/model'

const admin: AdminStaffResponse = {
  id: 'admin-1', fullName: 'Quản trị A', email: 'admin@example.com', role: 'ADMIN', createdAt: '2026-11-25T01:00:00Z',
}
const staff: AdminStaffResponse = {
  id: 'staff-1', fullName: 'Nhân viên B', email: 'staff@example.com', role: 'STAFF', createdAt: '2026-11-25T01:00:00Z',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function open(path: string, user: AdminStaffResponse, handle: (url: string, init?: RequestInit) => Response) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/admin/auth/me')) return json({ ...user, roles: [user.role] })
    if (url.includes('/admin/bookings')) return json({ items: [], totalItems: 0 })
    return handle(url, init)
  })
  vi.stubGlobal('fetch', fetch)
  const client = createAppQueryClient()
  const router = createMemoryRouter(createAdminRoutes(client), { initialEntries: [path] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { client, fetch, router }
}

beforeAll(async () => {
  await Promise.all([import('./staff-page'), import('@/features/auth/password-page')])
})
afterEach(() => vi.unstubAllGlobals())

describe('Nhân viên và đổi mật khẩu', () => {
  it('STAFF mở trực tiếp /staff thấy 403, không tải danh sách nhân viên', async () => {
    const { fetch, router } = open('/staff', staff, () => json({}))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bạn không có quyền' })).toHaveFocus())
    expect(router.state.location.pathname).toBe('/staff')
    expect(fetch.mock.calls.some(([url]) => url.includes('/admin/staff'))).toBe(false)
  })

  it('ADMIN thấy menu, ẩn thao tác trên dòng mình và focus email trùng', async () => {
    const { fetch } = open('/staff', admin, (_url, init) => init?.method === 'POST'
      ? json({ errors: [{ field: 'email', message: 'Email đã được đăng ký.' }] }, 409)
      : json([admin, staff]))
    const table = await screen.findByRole('table', { name: 'Danh sách nhân viên' })
    expect(await within(table).findByRole('button', { name: `Thao tác với ${staff.fullName}` })).toBeInTheDocument()
    expect(within(table).queryByRole('button', { name: `Thao tác với ${admin.fullName}` })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Nhân viên' }).some((link) => link.getAttribute('href') === '/staff')).toBe(true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Thêm nhân viên' }))
    const dialog = await screen.findByRole('dialog', { name: 'Thêm nhân viên' })
    const password = within(dialog).getByLabelText('Mật khẩu tạm') as HTMLInputElement
    expect(password.value).toHaveLength(24)
    await user.click(within(dialog).getByRole('button', { name: 'Sao chép mật khẩu tạm' }))
    expect(await navigator.clipboard.readText()).toBe(password.value)
    await user.type(within(dialog).getByLabelText('Họ và tên'), 'Nhân viên mới')
    const email = within(dialog).getByLabelText('Email')
    await user.type(email, 'STAFF@EXAMPLE.COM')
    await user.click(within(dialog).getByRole('button', { name: 'Thêm nhân viên' }))
    expect(await within(dialog).findByText('Email đã được đăng ký.')).toBeInTheDocument()
    expect(email).toHaveFocus()
    const post = fetch.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ email: staff.email, role: 'STAFF' })
  })

  it('đóng bảng và dialog khi phiên từ ADMIN chuyển xuống STAFF', async () => {
    const session = { ...admin }
    const { client } = open('/staff', session, () => json([admin, staff]))
    expect(await screen.findByRole('table', { name: 'Danh sách nhân viên' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Thêm nhân viên' }))
    expect(await screen.findByRole('dialog', { name: 'Thêm nhân viên' })).toBeInTheDocument()
    session.role = 'STAFF'
    await act(() => client.fetchQuery(adminMeOptions()))
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Danh sách nhân viên' })).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Thêm nhân viên' })).toBeNull()
  })

  it('chặn nhập lại sai, gắn lỗi mật khẩu hiện tại và chỉ gửi hai trường', async () => {
    const { fetch } = open('/account/password', staff,
      () => json({ errors: [{ field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng.' }] }, 400))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toHaveFocus())
    expect(screen.queryByRole('link', { name: 'Nhân viên' })).toBeNull()
    expect(screen.getByText(/72 byte UTF-8/)).toBeInTheDocument()
    const user = userEvent.setup()
    const current = screen.getByLabelText('Mật khẩu hiện tại')
    const confirmation = screen.getByLabelText('Nhập lại mật khẩu mới')
    await user.type(current, 'matkhau123')
    await user.type(screen.getByLabelText('Mật khẩu mới', { exact: true }), 'matkhauMoi72')
    await user.type(confirmation, 'matkhauMoi73')
    const submit = screen.getByRole('button', { name: 'Đổi mật khẩu' })
    await user.click(submit)
    expect(await screen.findByText('Mật khẩu nhập lại chưa khớp.')).toBeInTheDocument()
    expect(confirmation).toHaveFocus()
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
    await user.clear(confirmation)
    await user.type(confirmation, 'matkhauMoi72')
    await user.click(submit)
    expect(await screen.findByText('Mật khẩu hiện tại không đúng.')).toBeInTheDocument()
    expect(current).toHaveFocus()
    const put = fetch.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ currentPassword: 'matkhau123', newPassword: 'matkhauMoi72' })
  })
})
