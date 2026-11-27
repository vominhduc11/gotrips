import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Ellipsis, Plus } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { ErrorState } from '@/components/common/error-state'
import { ImagePreview } from '@/components/common/image-preview'
import { PageHeader } from '@/components/common/page-header'
import { Thumbnail } from '@/components/common/thumbnail'
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  getListAdminAirportsQueryOptions, getListAdminFlightRoutesQueryKey, getListAdminFlightRoutesQueryOptions,
  useCreateAdminFlightRoute, useDeleteAdminFlightRoute, useUpdateAdminFlightRoute, useUpdateAdminFlightRouteOrder,
} from '@/lib/api/generated/api'
import type { AdminFlightRouteResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage, applyApiErrors } from '@/lib/form-errors'
import { formatVND } from '@/lib/format'
import { FlightCodeSelect, FlightDialog, FlightEditButton, FlightField, FlightForm, type FlightOption } from './flight-form'
import { flightErrorProps } from './flight-form-utils'
import { flightRouteSchema } from './flight-form-schemas'

const emptyRows: AdminFlightRouteResponse[] = []
const routeName = (route: AdminFlightRouteResponse) => `${route.from.code} → ${route.to.code}`
const moveButtonId = (id: number, offset: number) => `flight-route-${id}-move-${offset < 0 ? 'up' : 'down'}`
type DialogState = { kind: 'create' } | { kind: 'edit' | 'delete'; route: AdminFlightRouteResponse }
type OrderDraft = { expectedIds: number[]; rows: AdminFlightRouteResponse[] }

export function FlightRoutesPage() {
  const client = useQueryClient()
  const query = useQuery(getListAdminFlightRoutesQueryOptions())
  const airports = useQuery(getListAdminAirportsQueryOptions())
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [draft, setDraft] = useState<OrderDraft | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [orderError, setOrderError] = useState<string | null>(null)
  const rows = draft?.rows ?? query.data ?? emptyRows
  const focusAfterMove = useRef<string | null>(null)
  useLayoutEffect(() => {
    // Ô của bảng có thể được mount lại khi đổi thứ tự. Tìm nút mới sau khi React cập nhật DOM.
    if (focusAfterMove.current) document.getElementById(focusAfterMove.current)?.focus()
    focusAfterMove.current = null
  }, [draft])
  const invalidate = () => void client.invalidateQueries({ queryKey: getListAdminFlightRoutesQueryKey() })

  const updateOrder = useUpdateAdminFlightRouteOrder({ mutation: {
    onSuccess: (saved) => {
      client.setQueryData(getListAdminFlightRoutesQueryKey(), saved)
      setDraft(null)
      toast.success('Đã lưu thứ tự chặng bay')
    },
    onError: (error) => {
      setOrderError(apiErrorMessage(error))
      if (error instanceof ApiError && error.status === 409) {
        setDraft(null)
        invalidate()
      }
    },
  } })
  const remove = useDeleteAdminFlightRoute({ mutation: {
    onSuccess: () => toast.success('Đã xoá chặng bay'),
    onError: (error) => {
      const message = apiErrorMessage(error)
      if (message) toast.error(message)
    },
    onSettled: () => {
      setDialog(null)
      invalidate()
    },
  } })

  const move = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= rows.length || updateOrder.isPending) return
    const next = rows.slice()
    const [route] = next.splice(index, 1)
    next.splice(target, 0, route)
    focusAfterMove.current = moveButtonId(route.id, offset)
    setDraft({ expectedIds: draft?.expectedIds ?? rows.map((item) => item.id), rows: next })
    setOrderError(null)
    setAnnouncement(`${routeName(route)} ở vị trí ${target + 1}`)
  }
  const canCreate = (airports.data?.length ?? 0) >= 2 && !airports.isError
  const orderChanged = draft?.rows.some((route, index) => route.id !== draft.expectedIds[index])
  const addButton = (
    <Button type="button" disabled={!canCreate || !!draft} onClick={() => setDialog({ kind: 'create' })}>
      <Plus aria-hidden="true" />Thêm chặng bay
    </Button>
  )
  const columns: DataTableColumn<AdminFlightRouteResponse>[] = [
    { id: 'route', header: 'Chặng bay', cell: ({ row }) => (
      <div className="flex min-w-44 items-center gap-2">
        <Thumbnail url={row.original.imageUrl} />
        <FlightEditButton disabled={!!draft} onClick={() => setDialog({ kind: 'edit', route: row.original })}>
          {routeName(row.original)}
        </FlightEditButton>
      </div>
    ) },
    { id: 'cities', header: 'Thành phố', cell: ({ row }) => `${row.original.from.city} → ${row.original.to.city}` },
    { id: 'duration', header: 'Thời lượng', cell: ({ row }) => `${row.original.durationMinutes} phút` },
    { id: 'price', header: 'Giá tham khảo', cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatVND(row.original.referencePrice)}</div>
    ) },
    { id: 'order', header: 'Vị trí', cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span className="me-1 tabular-nums">{row.index + 1}</span>
        <Button type="button" size="icon-sm" variant="outline" id={moveButtonId(row.original.id, -1)}
          aria-label={`Đưa ${routeName(row.original)} lên`}
          className="aria-disabled:opacity-40" aria-disabled={row.index === 0 || updateOrder.isPending}
          onClick={() => move(row.index, -1)}><ArrowUp aria-hidden="true" /></Button>
        <Button type="button" size="icon-sm" variant="outline" id={moveButtonId(row.original.id, 1)}
          aria-label={`Đưa ${routeName(row.original)} xuống`}
          className="aria-disabled:opacity-40" aria-disabled={row.index === rows.length - 1 || updateOrder.isPending}
          onClick={() => move(row.index, 1)}><ArrowDown aria-hidden="true" /></Button>
      </div>
    ) },
    { id: 'actions', header: 'Thao tác', cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" disabled={!!draft}
            aria-label={`Thao tác chặng ${routeName(row.original)}`}><Ellipsis aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog({ kind: 'edit', route: row.original })}>Sửa</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ kind: 'delete', route: row.original })}>Xoá</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ]

  return (
    <section className="space-y-5">
      <PageHeader title="Chặng bay phổ biến" description="Thứ tự này quyết định vị trí các chặng gợi ý trên website." action={addButton} />
      {airports.isError && <ErrorState message={apiErrorMessage(airports.error) ?? undefined} onRetry={() => void airports.refetch()} />}
      {airports.isSuccess && !canCreate && <p className="text-sm text-muted-foreground">Cần ít nhất hai sân bay để thêm chặng.</p>}
      {orderError && <p role="alert" className="text-sm text-destructive">{orderError}</p>}
      <p role="status" className="sr-only">{announcement}</p>
      {draft && <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!orderChanged || updateOrder.isPending}
          onClick={() => {
            setOrderError(null)
            updateOrder.mutate({ data: { expectedIds: draft.expectedIds, orderedIds: draft.rows.map((route) => route.id) } })
          }}>{updateOrder.isPending ? 'Đang lưu thứ tự…' : 'Lưu thứ tự'}</Button>
        <Button type="button" variant="outline" disabled={updateOrder.isPending} onClick={() => {
          setDraft(null)
          setOrderError(null)
        }}>Bỏ thay đổi thứ tự</Button>
      </div>}
      <DataTable label="Danh sách chặng bay phổ biến" columns={columns} rows={rows} getRowId={(row) => String(row.id)}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined} emptyTitle="Chưa có chặng bay phổ biến"
        emptyAction={addButton} onRetry={() => void query.refetch()} />
      {(dialog?.kind === 'create' || dialog?.kind === 'edit') && (
        <RouteDialog route={dialog.kind === 'edit' ? dialog.route : undefined} airports={airports.data ?? []}
          onClose={() => setDialog(null)} onSaved={invalidate} />
      )}
      <UnsavedChangesGuard isDirty={() => !!orderChanged} />
      {dialog?.kind === 'delete' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setDialog(null) }}
          title={`Xoá chặng ${routeName(dialog.route)}`}
          description="Chặng sẽ rời danh sách gợi ý. Ảnh minh hoạ của các đơn vé đến cùng sân bay có thể đổi."
          confirmLabel="Xoá chặng bay" danger pending={remove.isPending} onConfirm={() => remove.mutate({ id: dialog.route.id })} />
      )}
    </section>
  )
}

type RouteInput = z.input<typeof flightRouteSchema>
type RouteData = z.output<typeof flightRouteSchema>
const routeFields = ['fromCode', 'toCode', 'durationMinutes', 'referencePrice', 'imageUrl', 'imageAlt'] as const

function RouteDialog({ route, airports, onClose, onSaved }: {
  route?: AdminFlightRouteResponse
  airports: FlightOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const create = useCreateAdminFlightRoute()
  const update = useUpdateAdminFlightRoute()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<RouteInput, unknown, RouteData>({
      resolver: zodResolver(flightRouteSchema),
      defaultValues: {
        fromCode: route?.from.code ?? '', toCode: route?.to.code ?? '',
        durationMinutes: String(route?.durationMinutes ?? ''), referencePrice: String(route?.referencePrice ?? ''),
        imageUrl: route?.imageUrl ?? '', imageAlt: route?.imageAlt ?? '',
      },
    })
  const [imageUrl, imageAlt] = useWatch({ control, name: ['imageUrl', 'imageAlt'] })
  const close = () => { if (!isSubmitting) onClose() }
  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      if (route) await update.mutateAsync({ id: route.id, data })
      else await create.mutateAsync({ data })
      toast.success(route ? 'Đã lưu chặng bay' : 'Đã thêm chặng bay')
      onSaved()
      onClose()
    } catch (error) {
      setFormError(applyApiErrors(error, routeFields, setError))
    }
  })

  const airportField = (name: 'fromCode' | 'toCode', label: string) => {
    const id = `flight-route-${name}`
    const error = errors[name]?.message
    return (
      <FlightField id={id} label={label} error={error}>
        <Controller control={control} name={name} render={({ field }) => (
          <FlightCodeSelect id={id} label={label} value={field.value} onChange={field.onChange} onBlur={field.onBlur}
            triggerRef={field.ref} options={airports} error={error} />
        )} />
      </FlightField>
    )
  }
  const textField = (name: 'durationMinutes' | 'referencePrice' | 'imageUrl' | 'imageAlt', label: string) => {
    const id = `flight-route-${name}`
    const error = errors[name]?.message
    return (
      <FlightField id={id} label={label} error={error}>
        <Input id={id} type={name === 'imageUrl' ? 'url' : 'text'} autoComplete="off"
          inputMode={name === 'durationMinutes' || name === 'referencePrice' ? 'numeric' : undefined}
          {...flightErrorProps(id, error)} {...register(name)} />
      </FlightField>
    )
  }
  return (
    <FlightDialog title={route ? 'Sửa chặng bay' : 'Thêm chặng bay'}
      description="Giá tham khảo hiển thị cùng chặng gợi ý trên website." onClose={close}>
      <FlightForm onSubmit={submit} pending={isSubmitting} error={formError} onClose={close}
        submitLabel={route ? 'Lưu chặng bay' : 'Thêm chặng bay'}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            {airportField('fromCode', 'Điểm đi')}
            {airportField('toCode', 'Điểm đến')}
            {textField('durationMinutes', 'Thời lượng (phút)')}
            {textField('referencePrice', 'Giá tham khảo (VND)')}
          </div>
          {textField('imageUrl', 'Địa chỉ ảnh')}
          {textField('imageAlt', 'Mô tả ảnh')}
          <ImagePreview url={imageUrl} alt={imageAlt} />
        </FieldGroup>
      </FlightForm>
    </FlightDialog>
  )
}
