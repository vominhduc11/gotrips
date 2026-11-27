import { BedDouble, Map, Plane } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const labels = {
  booking: {
    PENDING: ['Chờ xử lý', 'bg-warning-surface text-warning'],
    CONFIRMED: ['Đã xác nhận', 'bg-success-surface text-success'],
    CANCELLED: ['Đã huỷ', 'bg-muted text-muted-foreground'],
  },
  payment: {
    UNPAID: ['Chưa thanh toán', 'bg-warning-surface text-warning'],
    PAID: ['Đã thanh toán', 'bg-success-surface text-success'],
    CANCELLED: ['Không thu', 'bg-muted text-muted-foreground'],
  },
  catalog: {
    ACTIVE: ['Đang hiện', 'bg-success-surface text-success'],
    HIDDEN: ['Đang ẩn', 'bg-muted text-muted-foreground'],
    DELETED: ['Đã xoá', 'bg-muted text-muted-foreground'],
  },
  departure: {
    UPCOMING: ['Sắp tới', 'bg-success-surface text-success'],
    SOLD_OUT: ['Hết chỗ', 'bg-warning-surface text-warning'],
    CLOSED: ['Đã đóng bán', 'bg-muted text-muted-foreground'],
    PAST: ['Đã qua', 'bg-muted text-muted-foreground'],
  },
} as const

type Status = {
  [Group in keyof typeof labels]: { group: Group; value: keyof (typeof labels)[Group] }
}[keyof typeof labels]

export function StatusBadge({ group, value }: Status) {
  // `Status` đã buộc `value` thuộc đúng nhóm; TypeScript không tự nối hai biến lại khi tra bảng.
  const [label, color] = (labels[group] as Record<string, readonly [string, string]>)[value]
  return <Badge variant="ghost" className={color}>{label}</Badge>
}

const services = {
  TOUR: { label: 'Tour', Icon: Map },
  HOTEL: { label: 'Khách sạn', Icon: BedDouble },
  FLIGHT: { label: 'Vé máy bay', Icon: Plane },
}

export function ServiceBadge({ kind }: { kind: keyof typeof services }) {
  const { label, Icon } = services[kind]
  return <Badge variant="outline"><Icon aria-hidden="true" />{label}</Badge>
}
