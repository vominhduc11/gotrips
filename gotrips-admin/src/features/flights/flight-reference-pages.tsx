import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  getListAdminAirlinesQueryKey, getListAdminAirlinesQueryOptions,
  getListAdminAirportsQueryKey, getListAdminAirportsQueryOptions,
  getListAdminFlightRoutesQueryKey, getListAdminFlightSchedulesQueryKey,
  useCreateAdminAirline, useCreateAdminAirport, useUpdateAdminAirline, useUpdateAdminAirport,
} from '@/lib/api/generated/api'
import type { AdminAirportResponse, AirlineResponse } from '@/lib/api/generated/model'
import { apiErrorMessage, applyApiErrors } from '@/lib/form-errors'
import { FlightDialog, FlightEditButton, FlightField, FlightForm } from './flight-form'
import { flightErrorProps } from './flight-form-utils'
import { flightReferenceSchema } from './flight-form-schemas'

type Entry = AirlineResponse & Partial<Pick<AdminAirportResponse, 'city' | 'sortOrder'>>
type ReferenceInput = z.input<ReturnType<typeof flightReferenceSchema>>
type ReferenceData = z.output<ReturnType<typeof flightReferenceSchema>>
const emptyRows: Entry[] = []

export function AirlinesPage() {
  const query = useQuery(getListAdminAirlinesQueryOptions())
  return <FlightReferencePage query={query} isAirport={false} />
}

export function AirportsPage() {
  const query = useQuery(getListAdminAirportsQueryOptions())
  return <FlightReferencePage query={query} isAirport />
}

function FlightReferencePage({ query, isAirport }: { query: UseQueryResult<Entry[], unknown>; isAirport: boolean }) {
  const [dialog, setDialog] = useState<{ entry?: Entry } | null>(null)
  const title = isAirport ? 'Sân bay' : 'Hãng bay'
  const item = isAirport ? 'sân bay' : 'hãng bay'
  const addButton = (
    <Button type="button" onClick={() => setDialog({})}>
      <Plus aria-hidden="true" />Thêm {item}
    </Button>
  )
  const columns: DataTableColumn<Entry>[] = [
    { id: 'code', header: isAirport ? 'Mã IATA' : 'Mã hãng', cell: ({ row }) => (
      <FlightEditButton onClick={() => setDialog({ entry: row.original })}>{row.original.code}</FlightEditButton>
    ) },
    { id: 'name', header: 'Tên', cell: ({ row }) => <span className="whitespace-normal">{row.original.name}</span> },
  ]
  if (isAirport) {
    columns.push(
      { id: 'city', header: 'Thành phố', cell: ({ row }) => row.original.city },
      { id: 'sortOrder', header: 'Thứ tự gợi ý', cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span> },
    )
  }
  columns.push({
    id: 'actions', header: 'Thao tác', cell: ({ row }) => (
      <Button type="button" variant="ghost" size="sm" aria-label={`Sửa ${item} ${row.original.code}`}
        onClick={() => setDialog({ entry: row.original })}>Sửa</Button>
    ),
  })
  return (
    <section className="space-y-5">
      <PageHeader title={title} action={addButton} />
      <DataTable label={`Danh sách ${item}`} columns={columns} rows={query.data ?? emptyRows} getRowId={(row) => row.code}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined} emptyTitle={`Chưa có ${item} nào`}
        emptyAction={addButton} onRetry={() => void query.refetch()} />
      {dialog && <ReferenceDialog isAirport={isAirport} entry={dialog.entry} onClose={() => setDialog(null)} />}
    </section>
  )
}

function ReferenceDialog({ isAirport, entry, onClose }: { isAirport: boolean; entry?: Entry; onClose: () => void }) {
  const client = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const addAirline = useCreateAdminAirline()
  const saveAirline = useUpdateAdminAirline()
  const addAirport = useCreateAdminAirport()
  const saveAirport = useUpdateAdminAirport()
  const item = isAirport ? 'sân bay' : 'hãng bay'
  const { register, setError, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ReferenceInput, unknown, ReferenceData>({
      resolver: zodResolver(flightReferenceSchema(isAirport)),
      defaultValues: {
        code: entry?.code ?? '', name: entry?.name ?? '', city: entry?.city ?? '', sortOrder: String(entry?.sortOrder ?? 0),
      },
    })
  const close = () => { if (!isSubmitting) onClose() }
  const fields = (isAirport ? ['code', 'name', 'city', 'sortOrder'] : ['code', 'name']) as (keyof ReferenceInput)[]
  const submit = handleSubmit(async ({ code, name, city, sortOrder }) => {
    setFormError(null)
    try {
      if (isAirport) {
        if (entry) await saveAirport.mutateAsync({ code: entry.code, data: { name, city, sortOrder } })
        else await addAirport.mutateAsync({ data: { code, name, city, sortOrder } })
      } else if (entry) {
        await saveAirline.mutateAsync({ code: entry.code, data: { name } })
      } else {
        await addAirline.mutateAsync({ data: { code, name } })
      }
      void client.invalidateQueries({ queryKey: isAirport ? getListAdminAirportsQueryKey() : getListAdminAirlinesQueryKey() })
      void client.invalidateQueries({ queryKey: getListAdminFlightSchedulesQueryKey() })
      if (isAirport) void client.invalidateQueries({ queryKey: getListAdminFlightRoutesQueryKey() })
      toast.success(entry ? `Đã lưu ${item}` : `Đã thêm ${item}`)
      onClose()
    } catch (error) {
      setFormError(applyApiErrors(error, fields, setError))
    }
  })

  const textField = (name: keyof ReferenceInput, label: string, readOnly = false) => {
    const id = `flight-reference-${name}`
    const error = errors[name]?.message
    return (
      <FlightField id={id} label={label} error={error}>
        <Input id={id} readOnly={readOnly} autoComplete="off"
          inputMode={name === 'sortOrder' ? 'numeric' : undefined} {...flightErrorProps(id, error)} {...register(name)} />
        {name === 'sortOrder' && <FieldDescription>Số nhỏ hơn xuất hiện trước trong danh sách sân bay.</FieldDescription>}
      </FlightField>
    )
  }

  return (
    <FlightDialog title={entry ? `Sửa ${item}` : `Thêm ${item}`}
      description={entry ? 'Mã giữ nguyên. Tên mới cũng được dùng trên đơn vé đã đặt.' : 'Mã được cố định sau khi tạo.'}
      onClose={close}>
      <FlightForm onSubmit={submit} pending={isSubmitting} error={formError} onClose={close}
        submitLabel={entry ? `Lưu ${item}` : `Thêm ${item}`}>
        <FieldGroup>
          {textField('code', isAirport ? 'Mã IATA' : 'Mã hãng', !!entry)}
          {textField('name', isAirport ? 'Tên sân bay' : 'Tên hãng')}
          {isAirport && textField('city', 'Thành phố')}
          {isAirport && textField('sortOrder', 'Thứ tự gợi ý')}
        </FieldGroup>
      </FlightForm>
    </FlightDialog>
  )
}
