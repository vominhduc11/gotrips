import { BedDouble, Building2, ClipboardList, Map, MapPin, MapPinned, Plane, Route, UserRoundCog, UsersRound, type LucideIcon } from 'lucide-react'

export interface NavigationItem {
  to: string
  label: string
  icon?: LucideIcon
  adminOnly?: boolean
  group?: string
}

export function visibleNavigation(items: NavigationItem[], isAdmin: boolean) {
  return items.filter((item) => !item.adminOnly || isAdmin)
}

export const adminNavigation: NavigationItem[] = [
  { to: '/', label: 'Tổng quan' },
  { to: '/bookings', label: 'Đơn đặt chỗ', group: 'Vận hành', icon: ClipboardList },
  { to: '/customers', label: 'Khách hàng', group: 'Vận hành', icon: UsersRound },
  { to: '/tours', label: 'Tour', group: 'Danh mục', icon: Map },
  { to: '/destinations', label: 'Điểm đến', group: 'Danh mục', icon: MapPin },
  { to: '/hotels', label: 'Khách sạn', group: 'Danh mục', icon: BedDouble },
  { to: '/flights/schedules', label: 'Lịch bay', group: 'Vé máy bay', icon: Plane },
  { to: '/flights/airlines', label: 'Hãng bay', group: 'Vé máy bay', icon: Building2 },
  { to: '/flights/airports', label: 'Sân bay', group: 'Vé máy bay', icon: MapPinned },
  { to: '/flights/routes', label: 'Chặng bay phổ biến', group: 'Vé máy bay', icon: Route },
  { to: '/staff', label: 'Nhân viên', group: 'Hệ thống', icon: UserRoundCog, adminOnly: true },
]
