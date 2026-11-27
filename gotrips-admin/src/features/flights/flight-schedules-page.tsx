import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { Ellipsis, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  getGetAdminFlightScheduleQueryOptions, getListAdminAirlinesQueryOptions, getListAdminAirportsQueryOptions,
  getListAdminFlightSchedulesQueryKey, getListAdminFlightSchedulesQueryOptions, useDeleteAdminFlightSchedule,
} from '@/lib/api/generated/api'
import type { AdminFlightScheduleResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatVND } from '@/lib/format'
import { FlightCodeSelect, FlightEditButton } from './flight-form'
import { airlineCode, airportCode } from './flight-form-schemas'
import { EditFlightScheduleDialog, FlightScheduleDialog } from './flight-schedule-dialog'

const sorts = {
  departTime: ['DEPART_TIME_ASC', 'DEPART_TIME_DESC'],
  flightNumber: ['FLIGHT_NUMBER_ASC', 'FLIGHT_NUMBER_DESC'],
  economyFare: ['ECONOMY_FARE_ASC', 'ECONOMY_FARE_DESC'],
} as const
const filtersSchema = z.object({
  fromCode: airportCode.optional().catch(undefined),
  toCode: airportCode.optional().catch(undefined),
  airlineCode: airlineCode.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(2147483647).catch(1),
  size: z.coerce.number().int().min(1).max(100).catch(20),
  sort: z.enum([...sorts.departTime, ...sorts.flightNumber, ...sorts.economyFare]).catch('DEPART_TIME_ASC'),
})
type Filters = z.infer<typeof filtersSchema>
const defaults = filtersSchema.parse({})
const emptyRows: AdminFlightScheduleResponse[] = []

function toParams(filters: Filters) {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined && value !== defaults[name as keyof Filters]) params.set(name, String(value))
  }
  return params
}

function tableSorting(sort: Filters['sort']): SortingState {
  const entry = Object.entries(sorts).find(([, [asc, desc]]) => sort === asc || sort === desc)
  return entry ? [{ id: entry[0], desc: entry[1][1] === sort }] : []
}

function sortFromTable(sorting: SortingState) {
  const column = sorting[0]
  return (column && sorts[column.id as keyof typeof sorts]?.[Number(column.desc)]) ?? defaults.sort
}

type ScheduleDialog = { kind: 'create' } | { kind: 'edit' | 'delete'; schedule: AdminFlightScheduleResponse }

export function FlightSchedulesPage() {
  const client = useQueryClient()
  const [params, setParams] = useSearchParams()
  const filters = filtersSchema.parse(Object.fromEntries(params))
  const query = useQuery(getListAdminFlightSchedulesQueryOptions(filters, { query: { placeholderData: keepPreviousData } }))
  const airportQuery = useQuery(getListAdminAirportsQueryOptions())
  const airlineQuery = useQuery(getListAdminAirlinesQueryOptions())
  const airports = airportQuery.data ?? []
  const airlines = airlineQuery.data ?? []
  const [dialog, setDialog] = useState<ScheduleDialog | null>(null)
  const close = () => setDialog(null)

  const update = useCallback((values: Partial<Filters>, replace = false) =>
    setParams(toParams({ ...filtersSchema.parse(Object.fromEntries(params)), page: 1, ...values }), { replace }),
  [params, setParams])
  const serverPage = query.isPlaceholderData ? undefined : query.data?.page
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== filters.page) update({ page: serverPage }, true)
  }, [filters.page, serverPage, update])

  const remove = useDeleteAdminFlightSchedule({ mutation: {
    onSuccess: () => toast.success('Đã xoá lịch bay'),
    onError: (error) => {
      const message = apiErrorMessage(error)
      if (message) toast.error(message)
    },
    onSettled: (_data, _error, { id }) => {
      close()
      void client.invalidateQueries({ queryKey: getListAdminFlightSchedulesQueryKey() })
      void client.invalidateQueries({ queryKey: getGetAdminFlightScheduleQueryOptions(id).queryKey })
    },
  } })

  const hasFilters = !!(filters.fromCode || filters.toCode || filters.airlineCode)
  const clear = () => setParams(toParams({ ...defaults, size: filters.size, sort: filters.sort }))
  const canCreate = airports.length >= 2 && airlines.length > 0 && !airportQuery.isError && !airlineQuery.isError
  const addButton = (
    <Button type="button" onClick={() => setDialog({ kind: 'create' })} disabled={!canCreate}>
      <Plus aria-hidden="true" />Thêm lịch bay
    </Button>
  )

  const columns: DataTableColumn<AdminFlightScheduleResponse>[] = [
    { accessorKey: 'flightNumber', header: 'Số hiệu', cell: ({ row }) => (
      <FlightEditButton onClick={() => setDialog({ kind: 'edit', schedule: row.original })}>{row.original.flightNumber}</FlightEditButton>
    ) },
    { id: 'airline', header: 'Hãng bay', cell: ({ row }) => row.original.airline.name },
    { id: 'route', header: 'Chặng', cell: ({ row }) => `${row.original.from.code} → ${row.original.to.code}` },
    { accessorKey: 'departTime', header: 'Cất cánh', cell: ({ row }) => <span className="tabular-nums">{row.original.departTime}</span> },
    { id: 'arrival', header: 'Hạ cánh', cell: ({ row }) => (
      <span className="tabular-nums">{row.original.arriveTime}{row.original.arrivesNextDay && ' (+1 ngày)'}</span>
    ) },
    { id: 'duration', header: 'Thời lượng', cell: ({ row }) => `${row.original.durationMinutes} phút` },
    { accessorKey: 'economyFare', header: 'Giá phổ thông', cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatVND(row.original.economyFare)}</div>
    ) },
    { id: 'seats', header: 'Ghế mỗi hạng', cell: ({ row: { original: s } }) => (
      <div className="text-right text-xs tabular-nums" title="Phổ thông / Phổ thông đặc biệt / Thương gia / Hạng nhất">
        {s.economySeats} / {s.premiumEconomySeats} / {s.businessSeats} / {s.firstSeats}
      </div>
    ) },
    { id: 'actions', header: 'Thao tác', cell: ({ row: { original: schedule } }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác lịch bay ${schedule.flightNumber}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog({ kind: 'edit', schedule })}>Sửa</DropdownMenuItem>
          {schedule.deletable
            ? <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ kind: 'delete', schedule })}>Xoá</DropdownMenuItem>
            : <DropdownMenuItem disabled>Lịch bay đã có đơn</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ]

  return (
    <section className="space-y-5">
      <PageHeader title="Lịch bay" description="Lịch bay lặp lại hằng ngày. Số ghế áp dụng riêng cho mỗi ngày bay."
        action={addButton} />
      <div className="flex flex-wrap items-center gap-2">
        <FlightCodeSelect label="Lọc theo điểm đi" allLabel="Mọi điểm đi" value={filters.fromCode ?? ''}
          options={airports} onChange={(code) => update({ fromCode: code || undefined })} />
        <FlightCodeSelect label="Lọc theo điểm đến" allLabel="Mọi điểm đến" value={filters.toCode ?? ''}
          options={airports} onChange={(code) => update({ toCode: code || undefined })} />
        <FlightCodeSelect label="Lọc theo hãng bay" allLabel="Mọi hãng bay" value={filters.airlineCode ?? ''}
          options={airlines} onChange={(code) => update({ airlineCode: code || undefined })} />
        {hasFilters && <Button type="button" variant="ghost" onClick={clear}>Xoá bộ lọc</Button>}
      </div>
      {(airportQuery.isError || airlineQuery.isError) && (
        <ErrorState message={apiErrorMessage(airportQuery.error ?? airlineQuery.error) ?? undefined}
          onRetry={() => { void airportQuery.refetch(); void airlineQuery.refetch() }} />
      )}
      {airportQuery.isSuccess && airlineQuery.isSuccess && !canCreate && (
        <p className="text-sm text-muted-foreground">Cần ít nhất một hãng bay và hai sân bay để thêm lịch.</p>
      )}
      <DataTable label="Danh sách lịch bay" columns={columns} rows={query.data?.items ?? emptyRows}
        getRowId={(row) => String(row.id)} pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        rowCount={query.data?.totalItems ?? 0} sorting={tableSorting(filters.sort)}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        onSortingChange={(sorting) => update({ sort: sortFromTable(sorting) })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle={hasFilters ? 'Không tìm thấy lịch bay phù hợp' : 'Chưa có lịch bay nào'}
        emptyAction={hasFilters ? <Button variant="outline" onClick={clear}>Xoá bộ lọc</Button> : addButton}
        onRetry={() => void query.refetch()} />
      {dialog?.kind === 'create' && <FlightScheduleDialog airports={airports} airlines={airlines} onClose={close} />}
      {dialog?.kind === 'edit' && <EditFlightScheduleDialog id={dialog.schedule.id} airports={airports} airlines={airlines} onClose={close} />}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) close() }}
          title={`Xoá lịch bay ${dialog.schedule.flightNumber}`}
          description="Lịch bay sẽ biến mất khỏi kết quả tìm vé. Chỉ xoá được lịch chưa từng có đơn."
          confirmLabel="Xoá lịch bay" danger pending={remove.isPending}
          onConfirm={() => remove.mutate({ id: dialog.schedule.id })} />
      )}
    </section>
  )
}
