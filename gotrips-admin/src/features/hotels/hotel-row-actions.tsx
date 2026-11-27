import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminHotelSummaryResponse } from '@/lib/api/generated/model'
import { websiteHotelUrl } from '@/lib/website'
import { deleteHotelDescription, useHotelLifecycle } from './use-hotel-lifecycle'

type RowHotel = Pick<AdminHotelSummaryResponse, 'id' | 'slug' | 'name' | 'status' | 'visibleOnWebsite'>

export function HotelRowActions({ hotel }: { hotel: RowHotel }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const lifecycle = useHotelLifecycle()
  const deleted = hotel.status === 'DELETED'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác khách sạn ${hotel.name}`}
            disabled={lifecycle.pending}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/hotels/${hotel.id}`}>{deleted ? 'Xem chi tiết' : 'Sửa'}</Link>
          </DropdownMenuItem>
          {hotel.status === 'ACTIVE' && (
            <DropdownMenuItem onSelect={() => lifecycle.hide(hotel.id)}>Ẩn khách sạn</DropdownMenuItem>
          )}
          {hotel.status === 'HIDDEN' && (
            <DropdownMenuItem onSelect={() => lifecycle.show(hotel.id)}>Hiện khách sạn</DropdownMenuItem>
          )}
          {/* Cờ do API tính: đang hiện VÀ có loại phòng, nếu không trang website trả 404. */}
          {hotel.visibleOnWebsite && (
            <DropdownMenuItem asChild>
              <a href={websiteHotelUrl(hotel.slug)} target="_blank" rel="noreferrer">Xem trên website</a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {deleted
            ? <DropdownMenuItem onSelect={() => lifecycle.restore(hotel.id)}>Khôi phục</DropdownMenuItem>
            : <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>Xoá</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmingDelete && (
        <ConfirmDialog open onOpenChange={setConfirmingDelete} title="Xoá khách sạn"
          description={deleteHotelDescription(hotel.name)} confirmLabel="Xoá khách sạn" danger
          pending={lifecycle.pending}
          onConfirm={() => lifecycle.remove(hotel.id, () => setConfirmingDelete(false))} />
      )}
    </>
  )
}
