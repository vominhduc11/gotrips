import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Thumbnail } from '@/components/common/thumbnail'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  getListAdminDestinationsQueryKey, getListAdminDestinationsQueryOptions, useDeleteAdminDestination,
} from '@/lib/api/generated/api'
import type { AdminDestinationResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { DestinationDialog } from './destination-dialog'

const emptyRows: AdminDestinationResponse[] = []
type DialogState = { kind: 'create' } | { kind: 'edit' | 'delete'; destination: AdminDestinationResponse } | null

export function DestinationListPage() {
  const client = useQueryClient()
  const query = useQuery(getListAdminDestinationsQueryOptions())
  const [dialog, setDialog] = useState<DialogState>(null)
  const rows = query.data ?? emptyRows
  const regions = useMemo(() => [...new Set(rows.map((row) => row.region))].sort((a, b) => a.localeCompare(b, 'vi')), [rows])

  const remove = useDeleteAdminDestination({
    mutation: {
      onSuccess: () => toast.success('Đã xoá điểm đến'),
      // 409: API nói còn bao nhiêu tour và khách sạn đang dùng (kể cả đã ẩn, đã xoá).
      onError: (error) => {
        const message = apiErrorMessage(error)
        if (message) toast.error(message, error instanceof ApiError && error.status === 409 ? { duration: 8000 } : undefined)
      },
      onSettled: () => {
        setDialog(null)
        void client.invalidateQueries({ queryKey: getListAdminDestinationsQueryKey() })
      },
    },
  })

  const columns = useMemo<DataTableColumn<AdminDestinationResponse>[]>(() => [
    { id: 'name', header: 'Điểm đến', cell: ({ row }) => (
      <div className="flex min-w-48 items-center gap-3">
        <Thumbnail url={row.original.imageUrl} />
        <button type="button" onClick={() => setDialog({ kind: 'edit', destination: row.original })}
          className="rounded-sm text-left font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          {row.original.name}
        </button>
      </div>
    ) },
    { id: 'slug', header: 'Slug', cell: ({ row }) => <span className="font-mono text-xs">{row.original.slug}</span> },
    { id: 'region', header: 'Vùng', cell: ({ row }) => row.original.region },
    { id: 'tourCount', header: () => <div className="text-right">Số tour</div>, cell: ({ row }) =>
      <div className="text-right tabular-nums">{row.original.tourCount}</div> },
    { id: 'hotelCount', header: () => <div className="text-right">Số khách sạn</div>, cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.hotelCount > 0 ? (
          <Link to={`/hotels?destinationId=${row.original.id}`} className="text-primary hover:underline"
            aria-label={`Xem khách sạn ở ${row.original.name} (${row.original.hotelCount})`}>
            {row.original.hotelCount}
          </Link>
        ) : row.original.hotelCount}
      </div>
    ) },
    { id: 'actions', header: 'Thao tác', cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác điểm đến ${row.original.name}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog({ kind: 'edit', destination: row.original })}>Sửa</DropdownMenuItem>
          <DropdownMenuItem variant="destructive"
            onSelect={() => setDialog({ kind: 'delete', destination: row.original })}>Xoá</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ], [])

  const addButton = (
    <Button type="button" onClick={() => setDialog({ kind: 'create' })}>
      <Plus aria-hidden="true" />Thêm điểm đến
    </Button>
  )

  return (
    <section className="space-y-5">
      <PageHeader title="Điểm đến"
        description="Số tour và khách sạn gồm cả bản đã ẩn và đã xoá. Chỉ xoá được điểm đến chưa dùng." action={addButton} />
      <DataTable label="Danh sách điểm đến" columns={columns} rows={rows} getRowId={(row) => String(row.id)}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle="Chưa có điểm đến nào" emptyAction={addButton} onRetry={() => void query.refetch()} />

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <DestinationDialog destination={dialog.kind === 'edit' ? dialog.destination : undefined} regions={regions}
          onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setDialog(null) }} title="Xoá điểm đến"
          description={`Xoá hẳn điểm đến "${dialog.destination.name}". Không xoá được nếu còn tour hoặc khách sạn đang dùng.`}
          confirmLabel="Xoá điểm đến" danger pending={remove.isPending}
          onConfirm={() => remove.mutate({ id: dialog.destination.id })} />
      )}
    </section>
  )
}
