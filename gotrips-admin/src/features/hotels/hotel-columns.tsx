import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import type { DataTableColumn } from '@/components/common/data-table'
import { StatusBadge } from '@/components/common/status-badges'
import { Thumbnail } from '@/components/common/thumbnail'
import type { AdminHotelSummaryResponse } from '@/lib/api/generated/model'
import { formatVND } from '@/lib/format'
import { HotelRowActions } from './hotel-row-actions'
import { hotelRoomWarning } from './hotel-visibility'

export const hotelColumns: DataTableColumn<AdminHotelSummaryResponse>[] = [
  { accessorKey: 'name', header: 'Khách sạn', cell: ({ row }) => {
    const warning = hotelRoomWarning(row.original)
    return (
      <div className="flex min-w-64 items-center gap-3 py-1">
        <Thumbnail url={row.original.imageUrl} />
        <div className="flex flex-col whitespace-normal">
          <Link to={`/hotels/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>
          {warning && (
            <span className="mt-1 flex items-center gap-1 text-xs text-warning">
              <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />{warning}
            </span>
          )}
        </div>
      </div>
    )
  } },
  { id: 'destination', header: 'Điểm đến', cell: ({ row }) => row.original.destinationName },
  { id: 'stars', header: 'Hạng sao', cell: ({ row }) =>
    <span className="tabular-nums">{row.original.starRating} sao</span> },
  { id: 'area', header: 'Khu vực', cell: ({ row }) =>
    <span className="block max-w-56 whitespace-normal">{row.original.area}</span> },
  { id: 'roomTypeCount', header: () => <div className="text-right">Loại phòng</div>, cell: ({ row }) =>
    <div className="text-right tabular-nums">{row.original.roomTypeCount}</div> },
  { id: 'minPrice', header: () => <div className="text-right">Giá từ / đêm</div>, cell: ({ row }) =>
    row.original.minPricePerNight === null
      ? <div className="text-right text-muted-foreground">—</div>
      : <div className="text-right font-medium tabular-nums">{formatVND(row.original.minPricePerNight)}</div> },
  { id: 'status', header: 'Trạng thái', cell: ({ row }) =>
    <StatusBadge group="catalog" value={row.original.status} /> },
  { id: 'actions', header: 'Thao tác', cell: ({ row }) => <HotelRowActions hotel={row.original} /> },
]
