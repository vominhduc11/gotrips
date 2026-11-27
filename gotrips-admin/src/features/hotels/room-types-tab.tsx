import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getListAdminRoomTypesQueryOptions, useDeleteAdminRoomType } from '@/lib/api/generated/api'
import type { AdminHotelDetailResponse, AdminRoomTypeResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatVND } from '@/lib/format'
import { lastSellingRoomWarning } from './hotel-visibility'
import { RoomTypeDialog } from './room-type-dialog'
import { refreshHotelQueries } from './use-hotel-lifecycle'

const emptyRows: AdminRoomTypeResponse[] = []

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit' | 'delete'; roomType: AdminRoomTypeResponse }
  | null

function deleteDescription(roomType: AdminRoomTypeResponse, hotel: AdminHotelDetailResponse) {
  const base = `Xoá hẳn loại phòng "${roomType.name}" cùng ảnh và tiện ích của nó. Loại phòng này chưa có đơn đặt.`
  const warning = lastSellingRoomWarning(hotel, roomType)
  return warning ? `${base} ${warning}` : base
}

export function RoomTypesTab({ hotel }: { hotel: AdminHotelDetailResponse }) {
  const client = useQueryClient()
  const query = useQuery(getListAdminRoomTypesQueryOptions(hotel.id))
  const [dialog, setDialog] = useState<DialogState>(null)
  // Khách sạn đã xoá chỉ được xem.
  const readOnly = hotel.status === 'DELETED'
  const refresh = () => void refreshHotelQueries(client, hotel.id)

  const remove = useDeleteAdminRoomType({
    mutation: {
      onSuccess: () => toast.success('Đã xoá loại phòng'),
      // 409: API giải thích vì sao không xoá được (đã có đơn), câu dài nên để lâu hơn.
      onError: (error) => {
        const message = apiErrorMessage(error)
        if (message) toast.error(message, error instanceof ApiError && error.status === 409 ? { duration: 8000 } : undefined)
      },
      onSettled: () => {
        setDialog(null)
        void refreshHotelQueries(client, hotel.id)
      },
    },
  })

  const columns = useMemo<DataTableColumn<AdminRoomTypeResponse>[]>(() => [
    { id: 'name', header: 'Loại phòng', cell: ({ row }) => readOnly
      ? <span className="block min-w-36 font-medium whitespace-normal">{row.original.name}</span>
      : (
        <button type="button" onClick={() => setDialog({ kind: 'edit', roomType: row.original })}
          className="min-w-36 rounded-sm text-left font-medium whitespace-normal text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
          {row.original.name}
        </button>
      ) },
    { id: 'price', header: () => <div className="text-right">Giá / đêm</div>, cell: ({ row }) =>
      <div className="text-right font-medium tabular-nums">{formatVND(row.original.pricePerNight)}</div> },
    { id: 'maxGuests', header: () => <div className="text-right">Khách tối đa</div>, cell: ({ row }) =>
      <div className="text-right tabular-nums">{row.original.maxGuests}</div> },
    { id: 'bed', header: 'Giường', cell: ({ row }) =>
      <span className="block max-w-56 min-w-36 whitespace-normal">{row.original.bedType}</span> },
    { id: 'area', header: () => <div className="text-right">Diện tích</div>, cell: ({ row }) =>
      <div className="text-right tabular-nums">{row.original.areaM2} m²</div> },
    { id: 'total', header: () => <div className="text-right">Số phòng</div>, cell: ({ row }) => {
      const { totalRooms, minimumTotalRooms } = row.original
      return (
        <div className="flex flex-col items-end tabular-nums">
          <span>{totalRooms}</span>
          {totalRooms === 0 && <span className="text-xs text-warning">Ngừng nhận đặt</span>}
          {minimumTotalRooms > 0 && (
            <span className="text-xs text-muted-foreground">Đang giữ tối đa {minimumTotalRooms}/đêm</span>
          )}
        </div>
      )
    } },
    { id: 'actions', header: 'Thao tác', cell: ({ row }) => readOnly ? null : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác loại phòng ${row.original.name}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog({ kind: 'edit', roomType: row.original })}>Sửa</DropdownMenuItem>
          {/* Cờ do API trả: loại phòng từng có đơn (kể cả đơn đã huỷ) không xoá được. */}
          {row.original.deletable
            ? <DropdownMenuItem variant="destructive"
                onSelect={() => setDialog({ kind: 'delete', roomType: row.original })}>Xoá</DropdownMenuItem>
            : <DropdownMenuItem disabled>Không xoá được vì đã có đơn</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ], [readOnly])

  const addButton = readOnly ? undefined : (
    <Button type="button" onClick={() => setDialog({ kind: 'create' })}>
      <Plus aria-hidden="true" />Thêm loại phòng
    </Button>
  )
  const rows = query.data ?? emptyRows

  return (
    <div className="space-y-3 pt-2">
      {rows.length > 0 && <div className="flex justify-end">{addButton}</div>}
      <DataTable label="Danh sách loại phòng" columns={columns} rows={rows} getRowId={(row) => String(row.id)}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle="Khách sạn chưa có loại phòng nào" emptyAction={addButton}
        onRetry={() => void query.refetch()} />

      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <RoomTypeDialog hotelId={hotel.id} roomType={dialog.kind === 'edit' ? dialog.roomType : undefined}
          stopWarning={dialog.kind === 'edit' ? lastSellingRoomWarning(hotel, dialog.roomType) : null}
          onClose={() => setDialog(null)} onSaved={refresh} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setDialog(null) }} title="Xoá loại phòng"
          description={deleteDescription(dialog.roomType, hotel)} confirmLabel="Xoá loại phòng" danger
          pending={remove.isPending} onConfirm={() => remove.mutate({ id: dialog.roomType.id })} />
      )}
    </div>
  )
}
