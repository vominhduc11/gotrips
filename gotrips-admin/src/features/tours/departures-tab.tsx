import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { StatusBadge } from '@/components/common/status-badges'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  getListAdminDeparturesQueryOptions, useCloseAdminDeparture, useDeleteAdminDeparture, useReopenAdminDeparture,
} from '@/lib/api/generated/api'
import type { AdminDepartureResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatDate, formatVND } from '@/lib/format'
import { DepartureDialog } from './departure-dialog'
import { refreshTourQueries } from './use-tour-lifecycle'

const emptyRows: AdminDepartureResponse[] = []

export type DepartureAction = 'edit' | 'close' | 'reopen' | 'delete'

/** Menu của một chuyến chỉ theo các cờ API trả về: giao diện không tự suy luật ngày hay luật đã có khách. */
export function DepartureActions({ departure, onSelect }: {
  departure: AdminDepartureResponse
  onSelect: (action: DepartureAction) => void
}) {
  const { editable, deletable, state, departureDate } = departure
  if (!editable && !deletable) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon-sm" variant="ghost"
          aria-label={`Thao tác chuyến ${formatDate(departureDate)}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {editable && <DropdownMenuItem onSelect={() => onSelect('edit')}>Sửa</DropdownMenuItem>}
        {editable && (state === 'CLOSED'
          ? <DropdownMenuItem onSelect={() => onSelect('reopen')}>Mở bán lại</DropdownMenuItem>
          : <DropdownMenuItem onSelect={() => onSelect('close')}>Đóng bán</DropdownMenuItem>)}
        {deletable && (
          <DropdownMenuItem variant="destructive" onSelect={() => onSelect('delete')}>Xoá</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit' | 'close' | 'delete'; departure: AdminDepartureResponse }
  | null

export function DeparturesTab({ tourId, readOnly }: { tourId: number; readOnly: boolean }) {
  const client = useQueryClient()
  const query = useQuery(getListAdminDeparturesQueryOptions(tourId))
  const [showPast, setShowPast] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const refresh = () => void refreshTourQueries(client, tourId)

  const mutation = (successMessage: string) => ({
    onSuccess: () => toast.success(successMessage),
    onError: (error: unknown) => {
      const message = apiErrorMessage(error)
      if (message) toast.error(message)
    },
    // Làm mới cả khi lỗi: 409 nghĩa là chuyến đã đổi so với màn hình đang hiện.
    onSettled: () => {
      setDialog(null)
      void refreshTourQueries(client, tourId)
    },
  })
  const close = useCloseAdminDeparture({ mutation: mutation('Đã đóng bán chuyến') })
  const reopen = useReopenAdminDeparture({ mutation: mutation('Đã mở bán lại chuyến') })
  const remove = useDeleteAdminDeparture({ mutation: mutation('Đã xoá chuyến') })
  const reopenDeparture = reopen.mutate

  const columns = useMemo<DataTableColumn<AdminDepartureResponse>[]>(() => [
    { id: 'date', header: 'Ngày khởi hành', cell: ({ row }) => row.original.editable
      ? (
        <button type="button" onClick={() => setDialog({ kind: 'edit', departure: row.original })}
          className="rounded-sm font-medium text-primary tabular-nums hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          {formatDate(row.original.departureDate)}
        </button>
      )
      : <span className="tabular-nums">{formatDate(row.original.departureDate)}</span> },
    { id: 'price', header: () => <div className="text-right">Giá</div>, cell: ({ row }) =>
      <div className="text-right font-medium tabular-nums">{formatVND(row.original.price)}</div> },
    { id: 'originalPrice', header: () => <div className="text-right">Giá gốc</div>, cell: ({ row }) =>
      row.original.originalPrice === null
      ? <div className="text-right text-muted-foreground">—</div>
      : (
        <div className="text-right tabular-nums">
          {formatVND(row.original.originalPrice)}
          {row.original.discountPercent !== null && (
            <span className="ml-2 text-xs text-success">giảm {row.original.discountPercent}%</span>
          )}
        </div>
      ) },
    { id: 'seats', header: 'Đã đặt / tổng', cell: ({ row }) => {
      const { bookedSeats, totalSeats, remainingSeats } = row.original
      return (
        <div className="min-w-32 space-y-1">
          <span className="tabular-nums">{bookedSeats} / {totalSeats} (còn {remainingSeats})</span>
          <Progress value={totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0}
            aria-label={`Đã đặt ${bookedSeats} trên ${totalSeats} chỗ`} />
        </div>
      )
    } },
    { id: 'state', header: 'Trạng thái', cell: ({ row }) =>
      <StatusBadge group="departure" value={row.original.state} /> },
    { id: 'actions', header: 'Thao tác', cell: ({ row }) => (
      <DepartureActions departure={row.original} onSelect={(action) => {
        // Mở bán lại đảo ngược được nên không cần hỏi lại.
        if (action === 'reopen') reopenDeparture({ id: row.original.id })
        else setDialog({ kind: action, departure: row.original })
      }} />
    ) },
  ], [reopenDeparture])

  const all = query.data ?? emptyRows
  const visible = useMemo(() => (showPast ? all : all.filter((departure) => departure.state !== 'PAST')), [all, showPast])
  const addButton = readOnly ? undefined : (
    <Button type="button" onClick={() => setDialog({ kind: 'create' })}>
      <Plus aria-hidden="true" />Thêm chuyến
    </Button>
  )

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id="show-past-departures" checked={showPast} onCheckedChange={setShowPast} />
          <Label htmlFor="show-past-departures">Hiện chuyến đã qua</Label>
        </div>
        {addButton}
      </div>
      <DataTable label="Lịch khởi hành" columns={columns} rows={visible} getRowId={(row) => String(row.id)}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle={all.length > 0 ? 'Không còn chuyến sắp tới' : 'Tour chưa có chuyến khởi hành nào'}
        emptyAction={addButton} onRetry={() => void query.refetch()} />

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <DepartureDialog tourId={tourId} departure={dialog.kind === 'edit' ? dialog.departure : undefined}
          onClose={() => setDialog(null)} onSaved={refresh} />
      )}
      {dialog?.kind === 'close' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setDialog(null) }} title="Đóng bán"
          description={`Khách không đặt thêm được chuyến ${formatDate(dialog.departure.departureDate)} và website hiện "Hết chỗ". Đơn đã đặt giữ nguyên; huỷ đơn cũng không mở bán lại. Bạn có thể mở bán lại sau.`}
          confirmLabel="Đóng bán" pending={close.isPending}
          onConfirm={() => close.mutate({ id: dialog.departure.id })} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setDialog(null) }} title="Xoá chuyến"
          description={`Xoá hẳn chuyến ${formatDate(dialog.departure.departureDate)}. Chuyến này chưa có khách đặt.`}
          confirmLabel="Xoá chuyến" danger pending={remove.isPending}
          onConfirm={() => remove.mutate({ id: dialog.departure.id })} />
      )}
    </div>
  )
}
