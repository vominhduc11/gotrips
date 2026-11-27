import { zodResolver } from '@hookform/resolvers/zod'
import { addDays, format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { CalendarDays, LoaderCircle } from 'lucide-react'
import { useMemo, useState, type ComponentProps } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCreateAdminDeparture, useUpdateAdminDeparture } from '@/lib/api/generated/api'
import type { AdminDepartureResponse } from '@/lib/api/generated/model'
import { applyApiErrors } from '@/lib/form-errors'
import { formatDate, formatVND, getTodayInVietnam } from '@/lib/format'
import {
  createDepartureFormSchema, departureFormFields, type DepartureFormInput, type DepartureFormOutput,
} from './departure-form-schema'

type DatePickerProps = Omit<ComponentProps<typeof Button>, 'value' | 'onChange'> & {
  value: string
  today: string
  onValueChange: (value: string) => void
}

/** Chọn ngày khởi hành: chặn hôm nay và mọi ngày trước đó theo giờ Việt Nam. */
function DepartureDatePicker({ value, today, onValueChange, ref, ...buttonProps }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const tomorrow = addDays(parseISO(today), 1)
  const selected = value ? parseISO(value) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={ref} type="button" variant="outline" {...buttonProps}>
          <CalendarDays aria-hidden="true" />
          <span className="flex-1 text-left">{value ? formatDate(value) : 'Chọn ngày'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar locale={vi} mode="single" selected={selected} defaultMonth={selected ?? tomorrow}
          disabled={{ before: tomorrow }}
          onSelect={(date) => {
            if (!date) return
            onValueChange(format(date, 'yyyy-MM-dd'))
            setOpen(false)
          }} />
      </PopoverContent>
    </Popover>
  )
}

/** Giá đang nhập hiện lại theo định dạng tiền để dễ thấy thiếu hay thừa số 0. */
function PriceHint({ value }: { value: string }) {
  const digits = value.replace(/[.\s]/g, '')
  return /^\d{1,13}$/.test(digits) ? <FieldDescription>{formatVND(Number(digits))}</FieldDescription> : null
}

/** Thêm chuyến khi không truyền `departure`, ngược lại là sửa. Mỗi lần mở là một lần mount mới. */
export function DepartureDialog({ tourId, departure, onClose, onSaved }: {
  tourId: number
  departure?: AdminDepartureResponse
  onClose: () => void
  onSaved: () => void
}) {
  const today = getTodayInVietnam()
  const schema = useMemo(() => createDepartureFormSchema(today), [today])
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register, handleSubmit, setError, control, formState: { errors, isSubmitting },
  } = useForm<DepartureFormInput, unknown, DepartureFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      departureDate: departure?.departureDate ?? '',
      price: departure ? String(departure.price) : '',
      originalPrice: departure?.originalPrice ? String(departure.originalPrice) : '',
      totalSeats: departure ? String(departure.totalSeats) : '',
    },
  })
  const [price, originalPrice] = useWatch({ control, name: ['price', 'originalPrice'] })
  const create = useCreateAdminDeparture()
  const update = useUpdateAdminDeparture()
  const dateLocked = departure !== undefined && !departure.dateEditable

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      if (departure) await update.mutateAsync({ id: departure.id, data })
      else await create.mutateAsync({ id: tourId, data })
      toast.success(departure ? 'Đã lưu chuyến' : 'Đã thêm chuyến')
      onSaved()
      onClose()
    } catch (error) {
      setFormError(applyApiErrors<DepartureFormInput>(error, departureFormFields, setError))
      // 409 nghĩa là dữ liệu đã đổi (có khách vừa đặt...): tải lại để cờ trên bảng đúng.
      onSaved()
    }
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{departure ? 'Sửa chuyến khởi hành' : 'Thêm chuyến'}</DialogTitle>
          <DialogDescription>Đổi giá không ảnh hưởng các đơn đã đặt.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <FieldGroup>
            <Field data-invalid={!!errors.departureDate}>
              <FieldLabel htmlFor="departure-date">Ngày khởi hành</FieldLabel>
              <Controller control={control} name="departureDate" render={({ field }) => (
                <DepartureDatePicker id="departure-date" ref={field.ref} value={field.value} today={today}
                  onValueChange={field.onChange} onBlur={field.onBlur} disabled={dateLocked}
                  aria-invalid={!!errors.departureDate} />
              )} />
              {dateLocked && <FieldDescription>Chuyến đã có khách đặt nên không đổi được ngày.</FieldDescription>}
              {errors.departureDate && <FieldError>{errors.departureDate.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.price}>
              <FieldLabel htmlFor="departure-price">Giá mỗi khách (VND)</FieldLabel>
              <Input id="departure-price" inputMode="numeric" autoComplete="off" aria-invalid={!!errors.price}
                {...register('price')} />
              <PriceHint value={price} />
              {errors.price && <FieldError>{errors.price.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.originalPrice}>
              <FieldLabel htmlFor="departure-original-price">Giá gốc (bỏ trống nếu không giảm)</FieldLabel>
              <Input id="departure-original-price" inputMode="numeric" autoComplete="off"
                aria-invalid={!!errors.originalPrice} {...register('originalPrice')} />
              <PriceHint value={originalPrice} />
              {errors.originalPrice && <FieldError>{errors.originalPrice.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.totalSeats}>
              <FieldLabel htmlFor="departure-seats">Tổng số chỗ</FieldLabel>
              <Input id="departure-seats" inputMode="numeric" autoComplete="off" aria-invalid={!!errors.totalSeats}
                {...register('totalSeats')} />
              {departure && <FieldDescription>Đã đặt {departure.bookedSeats} chỗ.</FieldDescription>}
              {errors.totalSeats && <FieldError>{errors.totalSeats.message}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {departure ? 'Lưu chuyến' : 'Thêm chuyến'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
