import { Star } from 'lucide-react'
import { Link } from 'react-router'
import type { DataTableColumn } from '@/components/common/data-table'
import { StatusBadge } from '@/components/common/status-badges'
import { Thumbnail } from '@/components/common/thumbnail'
import { Badge } from '@/components/ui/badge'
import type { AdminTourSummaryResponse } from '@/lib/api/generated/model'
import { formatDate, formatDuration } from '@/lib/format'
import { TourRowActions } from './tour-row-actions'

export const tourColumns: DataTableColumn<AdminTourSummaryResponse>[] = [
  { accessorKey: 'title', header: 'Tour', cell: ({ row }) => (
    <div className="flex min-w-64 items-center gap-3 py-1">
      <Thumbnail url={row.original.coverImageUrl} />
      <div className="flex flex-col whitespace-normal">
        <Link to={`/tours/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.title}
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{row.original.slug}</span>
      </div>
    </div>
  ) },
  { id: 'destination', header: 'Điểm đến', cell: ({ row }) => row.original.destinationName },
  { id: 'duration', header: 'Thời lượng', cell: ({ row }) =>
    <span className="tabular-nums">{formatDuration(row.original.durationDays, row.original.durationNights)}</span> },
  { id: 'status', header: 'Trạng thái', cell: ({ row }) =>
    <StatusBadge group="catalog" value={row.original.status} /> },
  { id: 'featured', header: 'Nổi bật', cell: ({ row }) => row.original.featured
    ? <Badge variant="outline"><Star aria-hidden="true" />Nổi bật</Badge>
    : <span className="text-muted-foreground">Không</span> },
  { id: 'upcoming', header: 'Chuyến sắp tới', cell: ({ row }) => (
    <div className="flex flex-col items-end tabular-nums">
      <span>{row.original.upcomingDepartureCount} chuyến</span>
      {row.original.nextDepartureDate && (
        <span className="text-xs text-muted-foreground">Gần nhất {formatDate(row.original.nextDepartureDate)}</span>
      )}
    </div>
  ) },
  { id: 'remainingSeats', header: 'Chỗ còn', cell: ({ row }) =>
    <div className="text-right tabular-nums">{row.original.remainingSeats}</div> },
  { id: 'actions', header: 'Thao tác', cell: ({ row }) => <TourRowActions tour={row.original} /> },
]
