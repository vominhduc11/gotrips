import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminTourSummaryResponse } from '@/lib/api/generated/model'
import { websiteTourUrl } from '@/lib/website'
import { deleteTourDescription, useTourLifecycle } from './use-tour-lifecycle'

type RowTour = Pick<AdminTourSummaryResponse, 'id' | 'slug' | 'title' | 'status'>

export function TourRowActions({ tour }: { tour: RowTour }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const lifecycle = useTourLifecycle()
  const deleted = tour.status === 'DELETED'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác tour ${tour.title}`}
            disabled={lifecycle.pending}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/tours/${tour.id}`}>{deleted ? 'Xem chi tiết' : 'Sửa'}</Link>
          </DropdownMenuItem>
          {tour.status === 'ACTIVE' && (
            <>
              <DropdownMenuItem onSelect={() => lifecycle.hide(tour.id)}>Ẩn tour</DropdownMenuItem>
              {/* Chỉ tour đang hiện mới mở được trên website. */}
              <DropdownMenuItem asChild>
                <a href={websiteTourUrl(tour.slug)} target="_blank" rel="noreferrer">Xem trên website</a>
              </DropdownMenuItem>
            </>
          )}
          {tour.status === 'HIDDEN' && (
            <DropdownMenuItem onSelect={() => lifecycle.show(tour.id)}>Hiện tour</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {deleted
            ? <DropdownMenuItem onSelect={() => lifecycle.restore(tour.id)}>Khôi phục</DropdownMenuItem>
            : <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>Xoá</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmingDelete && (
        <ConfirmDialog open onOpenChange={setConfirmingDelete} title="Xoá tour"
          description={deleteTourDescription(tour.title)} confirmLabel="Xoá tour" danger pending={lifecycle.pending}
          onConfirm={() => lifecycle.remove(tour.id, () => setConfirmingDelete(false))} />
      )}
    </>
  )
}
