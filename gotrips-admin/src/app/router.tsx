import type { QueryClient } from '@tanstack/react-query'
import { redirect, type RouteObject } from 'react-router'
import { RouteError } from '@/components/common/route-error'
import { AdminLayout } from '@/components/layout/admin-layout'
import { RouteLoading } from '@/components/common/route-loading'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { NotFoundPage } from '@/features/not-found/not-found-page'
import { loginLoader, requireAdmin, requireStaff } from './route-guards'

export function createAdminRoutes(queryClient: QueryClient): RouteObject[] {
  const errorElement = <RouteError />
  const hydrateFallbackElement = <RouteLoading />
  return [
    {
      path: '/login',
      loader: loginLoader(queryClient),
      lazy: { Component: async () => (await import('@/features/auth/login-page')).LoginPage },
      errorElement,
      hydrateFallbackElement,
    },
    {
      path: '/',
      loader: requireStaff(queryClient),
      element: <AdminLayout />,
      errorElement,
      hydrateFallbackElement,
      children: [
        { index: true, element: <DashboardPage />, handle: { breadcrumb: 'Tổng quan' } },
        {
          path: 'bookings',
          handle: { breadcrumb: 'Đơn đặt chỗ' },
          children: [
            { index: true, lazy: { Component: async () => (await import('@/features/bookings/booking-list-page')).BookingListPage } },
            {
              path: ':code',
              handle: { breadcrumb: 'Chi tiết đơn' },
              lazy: { Component: async () => (await import('@/features/bookings/booking-detail-page')).BookingDetailPage },
            },
          ],
        },
        {
          path: 'customers',
          handle: { breadcrumb: 'Khách hàng' },
          children: [
            { index: true, lazy: { Component: async () => (await import('@/features/customers/customer-list-page')).CustomerListPage } },
            {
              path: ':id',
              handle: { breadcrumb: 'Hồ sơ khách hàng' },
              lazy: { Component: async () => (await import('@/features/customers/customer-detail-page')).CustomerDetailPage },
            },
          ],
        },
        {
          path: 'staff',
          loader: requireAdmin(queryClient),
          handle: { breadcrumb: 'Nhân viên' },
          lazy: { Component: async () => (await import('@/features/staff/staff-page')).StaffPage },
        },
        {
          path: 'account/password',
          handle: { breadcrumb: 'Đổi mật khẩu' },
          lazy: { Component: async () => (await import('@/features/auth/password-page')).PasswordPage },
        },
        {
          path: 'tours',
          handle: { breadcrumb: 'Tour' },
          children: [
            { index: true, lazy: { Component: async () => (await import('@/features/tours/tour-list-page')).TourListPage } },
            {
              path: 'new',
              handle: { breadcrumb: 'Thêm tour' },
              lazy: { Component: async () => (await import('@/features/tours/tour-new-page')).TourNewPage },
            },
            {
              path: ':id',
              handle: { breadcrumb: 'Chi tiết tour' },
              lazy: { Component: async () => (await import('@/features/tours/tour-edit-page')).TourEditPage },
            },
          ],
        },
        {
          path: 'destinations',
          handle: { breadcrumb: 'Điểm đến' },
          lazy: { Component: async () => (await import('@/features/destinations/destination-list-page')).DestinationListPage },
        },
        {
          path: 'flights',
          handle: { breadcrumb: 'Vé máy bay' },
          children: [
            { index: true, loader: () => redirect('/flights/schedules') },
            {
              path: 'schedules',
              handle: { breadcrumb: 'Lịch bay' },
              lazy: { Component: async () => (await import('@/features/flights/flight-schedules-page')).FlightSchedulesPage },
            },
            {
              path: 'airlines',
              handle: { breadcrumb: 'Hãng bay' },
              lazy: { Component: async () => (await import('@/features/flights/flight-reference-pages')).AirlinesPage },
            },
            {
              path: 'airports',
              handle: { breadcrumb: 'Sân bay' },
              lazy: { Component: async () => (await import('@/features/flights/flight-reference-pages')).AirportsPage },
            },
            {
              path: 'routes',
              handle: { breadcrumb: 'Chặng bay phổ biến' },
              lazy: { Component: async () => (await import('@/features/flights/flight-routes-page')).FlightRoutesPage },
            },
          ],
        },
        {
          path: 'hotels',
          handle: { breadcrumb: 'Khách sạn' },
          children: [
            { index: true, lazy: { Component: async () => (await import('@/features/hotels/hotel-list-page')).HotelListPage } },
            {
              path: 'new',
              handle: { breadcrumb: 'Thêm khách sạn' },
              lazy: { Component: async () => (await import('@/features/hotels/hotel-new-page')).HotelNewPage },
            },
            {
              path: ':id',
              handle: { breadcrumb: 'Chi tiết khách sạn' },
              lazy: { Component: async () => (await import('@/features/hotels/hotel-edit-page')).HotelEditPage },
            },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage />, errorElement },
  ]
}
