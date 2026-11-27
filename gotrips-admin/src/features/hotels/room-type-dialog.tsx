import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateAdminRoomType, useUpdateAdminRoomType } from '@/lib/api/generated/api'
import type { AdminRoomTypeResponse } from '@/lib/api/generated/model'
import { applyApiErrors } from '@/lib/form-errors'
import { formatVND } from '@/lib/format'
import { AmenityPicker } from './amenity-picker'
import { ImageListField } from './image-list-field'
import {
  roomTypeFormFields, roomTypeFormSchema, roomTypeToFormValues, type RoomTypeFormInput, type RoomTypeFormOutput,
} from './room-type-form-schema'

/** Giá đang nhập hiện lại theo định dạng tiền để dễ thấy thiếu hay thừa số 0. */
function PriceHint({ value }: { value: string }) {
  const digits = value.replace(/[.\s]/g, '')
  return /^\d{1,13}$/.test(digits) ? <FieldDescription>{formatVND(Number(digits))}</FieldDescription> : null
}

/**
 * Thêm loại phòng khi không truyền `roomType`, ngược lại là sửa. Mỗi lần mở là một lần mount mới. Không gắn thêm bộ
 * chặn rời trang: React Router chỉ cho một bộ chặn và form khách sạn ở tab bên cạnh đang giữ nó.
 */
export function RoomTypeDialog({ hotelId, roomType, stopWarning, onClose, onSaved }: {
  hotelId: number
  roomType?: AdminRoomTypeResponse
  stopWarning: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RoomTypeFormInput, unknown, RoomTypeFormOutput>({
    resolver: zodResolver(roomTypeFormSchema), defaultValues: roomTypeToFormValues(roomType),
  })
  const { register, handleSubmit, setError, control, formState: { errors, isSubmitting } } = form
  const [price, totalRooms] = useWatch({ control, name: ['pricePerNight', 'totalRooms'] })
  const create = useCreateAdminRoomType()
  const update = useUpdateAdminRoomType()

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      if (roomType) await update.mutateAsync({ id: roomType.id, data })
      else await create.mutateAsync({ id: hotelId, data })
      toast.success(roomType ? 'Đã lưu loại phòng' : 'Đã thêm loại phòng')
      onSaved()
      onClose()
    } catch (error) {
      setFormError(applyApiErrors<RoomTypeFormInput>(error, roomTypeFormFields(data.images.length), setError))
      // 409 nghĩa là dữ liệu đã đổi (có khách vừa đặt, khách sạn vừa bị xoá...): tải lại để cờ trên bảng đúng.
      onSaved()
    }
  })

  const input = (
    name: 'name' | 'bedType' | 'maxGuests' | 'areaM2', label: string, numeric = false,
  ) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`room-${name}`}>{label}</FieldLabel>
      <Input id={`room-${name}`} inputMode={numeric ? 'numeric' : undefined} autoComplete="off"
        aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <FieldError>{errors[name].message}</FieldError>}
    </Field>
  )

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      {/* `!`: DialogContent đã đặt `sm:max-w-sm` mà cn() của admin chưa gộp được class xung đột. */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl!">
        <DialogHeader>
          <DialogTitle>{roomType ? 'Sửa loại phòng' : 'Thêm loại phòng'}</DialogTitle>
          <DialogDescription>Đổi giá không ảnh hưởng các đơn đã đặt.</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form noValidate onSubmit={submit} className="space-y-4" aria-label="Loại phòng">
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <FieldGroup>
              {input('name', 'Tên loại phòng')}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.pricePerNight}>
                  <FieldLabel htmlFor="room-price">Giá mỗi phòng một đêm (VND)</FieldLabel>
                  <Input id="room-price" inputMode="numeric" autoComplete="off"
                    aria-invalid={!!errors.pricePerNight} {...register('pricePerNight')} />
                  <PriceHint value={price} />
                  {errors.pricePerNight && <FieldError>{errors.pricePerNight.message}</FieldError>}
                </Field>
                {input('maxGuests', 'Số khách tối đa mỗi phòng', true)}
                {input('bedType', 'Giường')}
                {input('areaM2', 'Diện tích (m²)', true)}
              </div>
              <Field data-invalid={!!errors.totalRooms}>
                <FieldLabel htmlFor="room-total">Tổng số phòng</FieldLabel>
                <Input id="room-total" inputMode="numeric" autoComplete="off" aria-invalid={!!errors.totalRooms}
                  aria-describedby="room-total-help" {...register('totalRooms')} />
                <FieldDescription id="room-total-help">
                  Nhập 0 để ngừng nhận đặt, bỏ loại phòng khỏi trang chi tiết và khỏi giá từ của khách sạn.
                  {roomType && roomType.minimumTotalRooms > 0 &&
                    ` Có đêm đang giữ ${roomType.minimumTotalRooms} phòng nên không giảm thấp hơn ${roomType.minimumTotalRooms}.`}
                </FieldDescription>
                {stopWarning && /^0+$/.test(totalRooms.trim()) && (
                  <p role="status" className="text-sm text-warning">{stopWarning}</p>
                )}
                {errors.totalRooms && <FieldError>{errors.totalRooms.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.amenityCodes}>
                <span className="font-medium" aria-hidden="true">Tiện ích trong phòng</span>
                <Controller control={control} name="amenityCodes" render={({ field }) => (
                  <AmenityPicker scope="ROOM" legend="Tiện ích trong phòng" idPrefix="room-amenity"
                    value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                    invalid={!!errors.amenityCodes} />
                )} />
                {errors.amenityCodes && <FieldError>{errors.amenityCodes.message}</FieldError>}
              </Field>
              <div className="space-y-2">
                <h3 className="font-medium">Ảnh loại phòng</h3>
                <ImageListField idPrefix="room-image" />
              </div>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {roomType ? 'Lưu loại phòng' : 'Thêm loại phòng'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
