import type { RouteObject } from 'react-router'
import { AdminLayout } from '@/components/layout/admin-layout'
import { DashboardPage } from '@/pages/dashboard-page'
import { NotFoundPage } from '@/pages/not-found-page'

/**
 * Khai báo route tách khỏi việc tạo router, để test có thể dùng createMemoryRouter với cùng cấu hình.
 * Chỉ có 2 route: "/" (Dashboard trong khung sidebar) và "*" (404).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AdminLayout />,
    children: [{ index: true, element: <DashboardPage /> }],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]
