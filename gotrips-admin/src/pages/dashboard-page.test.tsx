import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'

// Smoke test: layout Dashboard render được và route không tồn tại hiện trang 404.
// Dùng createMemoryRouter với cùng cấu hình routes để không cần trình duyệt thật.
describe('Layout quản trị', () => {
  it('render khung sidebar và trang Tổng quan ở "/"', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(<RouterProvider router={router} />)

    expect(screen.getByText('GoTrips Admin')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument()
  })

  it('hiện trang 404 khi đường dẫn không tồn tại', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/khong-ton-tai'] })
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument()
  })
})
