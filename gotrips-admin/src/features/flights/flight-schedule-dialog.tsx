import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ErrorState } from '@/components/common/error-state'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getGetAdminFlightScheduleQueryOptions, getListAdminFlightSchedulesQueryKey,
  useCreateAdminFlightSchedule, useUpdateAdminFlightSchedule,
} from '@/lib/api/generated/api'
import type { AdminFlightScheduleResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage, applyApiErrors } from '@/lib/form-errors'
import { FlightCodeSelect, FlightDialog, FlightField, FlightForm, type FlightOption } from './flight-form'
import { activeFlightTrigger, flightErrorProps } from './flight-form-utils'
import { flightScheduleSchema } from './flight-form-schemas'

export function EditFlightScheduleDialog({ id, onClose, airports, airlines }: {
  id: number
  onClose: () => void
  airports: FlightOption[]
  airlines: FlightOption[]
}) {
  const [trigger] = useState(activeFlightTrigger)
  const query = useQuery(getGetAdminFlightScheduleQueryOptions(id, {
    query: { refetchOnMount: 'always', refetchOnWindowFocus: false },
  }))
  if (query.data && !query.isError && !query.isFetching) {
    return <FlightScheduleDialog schedule={query.data} onClose={onClose} airports={airports} airlines={airlines}
      returnFocus={trigger} />
  }
  return (
    <FlightDialog title="Sửa lịch bay" description="Chi tiết lịch bay." onClose={onClose} returnFocus={trigger}>
      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError && query.error.status === 404
          ? 'Lịch bay này không còn tồn tại.' : apiErrorMessage(query.error) ?? undefined} onRetry={() => void query.refetch()} />
      ) : <div aria-label="Đang tải lịch bay" aria-busy="true"><Skeleton className="h-36 w-full" /></div>}
    </FlightDialog>
  )
}

type ScheduleInput = z.input<ReturnType<typeof flightScheduleSchema>>
type ScheduleData = z.output<ReturnType<typeof flightScheduleSchema>>
const editFields = [
  'departTime', 'durationMinutes', 'economyFare', 'economySeats', 'premiumEconomySeats', 'businessSeats', 'firstSeats',
] as const
const createFields = ['airlineCode', 'flightNumber', 'fromCode', 'toCode', ...editFields] as const

export function FlightScheduleDialog({ onClose, airports, airlines, schedule, returnFocus }: {
  onClose: () => void
  airports: FlightOption[]
  airlines: FlightOption[]
  schedule?: AdminFlightScheduleResponse
  returnFocus?: HTMLElement | null
}) {
  const client = useQueryClient()
  const create = useCreateAdminFlightSchedule()
  const update = useUpdateAdminFlightSchedule()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<ScheduleInput, unknown, ScheduleData>({
      resolver: zodResolver(flightScheduleSchema(!!schedule)),
      defaultValues: {
        flightNumber: schedule?.flightNumber ?? '', airlineCode: schedule?.airline.code ?? '',
        fromCode: schedule?.from.code ?? '', toCode: schedule?.to.code ?? '',
        departTime: schedule?.departTime ?? '', durationMinutes: String(schedule?.durationMinutes ?? ''),
        economyFare: String(schedule?.economyFare ?? ''), economySeats: String(schedule?.economySeats ?? 0),
        premiumEconomySeats: String(schedule?.premiumEconomySeats ?? 0), businessSeats: String(schedule?.businessSeats ?? 0),
        firstSeats: String(schedule?.firstSeats ?? 0),
      },
    })
  const close = () => { if (!isSubmitting) onClose() }
  const timingLocked = schedule?.timingEditable === false
  const submit = handleSubmit(async ({ airlineCode, flightNumber, fromCode, toCode, ...values }) => {
    setFormError(null)
    try {
      if (schedule) {
        const data = timingLocked ? { ...values, departTime: schedule.departTime, durationMinutes: schedule.durationMinutes } : values
        await update.mutateAsync({ id: schedule.id, data })
      } else await create.mutateAsync({ data: { ...values, airlineCode, flightNumber, fromCode, toCode } })
      void client.invalidateQueries({ queryKey: getListAdminFlightSchedulesQueryKey() })
      if (schedule) void client.invalidateQueries({ queryKey: getGetAdminFlightScheduleQueryOptions(schedule.id).queryKey })
      toast.success(schedule ? 'Đã lưu lịch bay' : 'Đã thêm lịch bay')
      onClose()
    } catch (error) {
      setFormError(applyApiErrors(error, schedule ? editFields : createFields, setError))
      if (schedule && error instanceof ApiError && error.status === 409) {
        void client.invalidateQueries({ queryKey: getListAdminFlightSchedulesQueryKey() })
        // Báo lỗi ở bản nháp đang mở. Tải lại chi tiết ở lần mở tiếp theo.
        void client.invalidateQueries({ queryKey: getGetAdminFlightScheduleQueryOptions(schedule.id).queryKey, refetchType: 'none' })
      }
    }
  })

  const textField = (name: keyof ScheduleInput, label: string, attributes: { type?: 'time'; readOnly?: boolean } = {}) => {
    const id = `flight-schedule-${name}`
    const error = errors[name]?.message
    return (
      <FlightField id={id} label={label} error={error}>
        <Input id={id} autoComplete="off" {...attributes} {...flightErrorProps(id, error)} {...register(name)}
          inputMode={name === 'flightNumber' || name === 'departTime' ? undefined : 'numeric'} />
      </FlightField>
    )
  }

  const codeField = (name: 'airlineCode' | 'fromCode' | 'toCode', label: string, options: FlightOption[]) => {
    const id = `flight-schedule-${name}`
    const error = errors[name]?.message
    return (
      <FlightField id={id} label={label} error={error}>
        <Controller name={name} control={control} render={({ field }) => (
          <FlightCodeSelect id={id} label={label} value={field.value} onChange={field.onChange} onBlur={field.onBlur}
            triggerRef={field.ref} options={options} error={error} />
        )} />
      </FlightField>
    )
  }

  return (
    <FlightDialog title={schedule ? `Sửa lịch bay ${schedule.flightNumber}` : 'Thêm lịch bay'}
      description={schedule ? 'Giá mới áp dụng cho các đơn đặt sau khi lưu.' : 'Lịch bay lặp lại hằng ngày.'} onClose={close} returnFocus={returnFocus}>
      <FlightForm onSubmit={submit} pending={isSubmitting} error={formError} onClose={close}
        submitLabel={schedule ? 'Lưu lịch bay' : 'Thêm lịch bay'}>
        <FieldGroup>
          {schedule ? (
            <dl className="grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
              <div><dt>Hãng bay</dt><dd className="font-medium">{schedule.airline.name}</dd></div>
              <div><dt>Điểm đi</dt><dd className="font-medium">{schedule.from.code} · {schedule.from.city}</dd></div>
              <div><dt>Điểm đến</dt><dd className="font-medium">{schedule.to.code} · {schedule.to.city}</dd></div>
            </dl>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {codeField('airlineCode', 'Hãng bay', airlines)}
              {textField('flightNumber', 'Số hiệu chuyến bay')}
              {codeField('fromCode', 'Điểm đi', airports)}
              {codeField('toCode', 'Điểm đến', airports)}
            </div>
          )}
          {timingLocked && <p className="rounded-lg bg-warning-surface p-3 text-sm text-warning">
            Lịch bay từng có đơn. Giờ cất cánh và thời lượng phải giữ nguyên.
          </p>}
          <div className="grid gap-4 sm:grid-cols-3">
            {textField('departTime', 'Giờ cất cánh', { type: 'time', readOnly: timingLocked })}
            {textField('durationMinutes', 'Thời lượng (phút)', { readOnly: timingLocked })}
            {textField('economyFare', 'Giá phổ thông (VND)')}
          </div>
          {schedule && <p className="text-sm text-muted-foreground">
            Giờ hạ cánh đã lưu {schedule.arriveTime}{schedule.arrivesNextDay ? ' (+1 ngày)' : ''}
          </p>}
          <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium">Số ghế mỗi ngày theo hạng</legend>
            {textField('economySeats', 'Phổ thông')}
            {textField('premiumEconomySeats', 'Phổ thông đặc biệt')}
            {textField('businessSeats', 'Thương gia')}
            {textField('firstSeats', 'Hạng nhất')}
          </fieldset>
        </FieldGroup>
      </FlightForm>
    </FlightDialog>
  )
}
