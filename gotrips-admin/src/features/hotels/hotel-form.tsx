import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ImagePreview } from '@/components/common/image-preview'
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DestinationCombobox } from '@/features/tours/destination-combobox'
import { getListAdminDestinationsQueryOptions } from '@/lib/api/generated/api'
import { applyApiErrors } from '@/lib/form-errors'
import { slugify } from '@/lib/slug'
import { AmenityPicker } from './amenity-picker'
import {
  HOTEL_DESCRIPTION_MAX_LENGTH, HOTEL_SLUG_MAX_LENGTH, hotelFormFields, hotelFormSchema, type HotelFormInput,
  type HotelFormOutput,
} from './hotel-form-schema'
import { ImageListField } from './image-list-field'

interface HotelFormProps {
  mode: 'create' | 'edit'
  initialValues: HotelFormInput
  /**
   * Gọi API. Thành công thì trả giá trị đã được API chuẩn hoá để form lấy làm mốc mới, và một việc làm tiếp (ví dụ
   * chuyển trang) chạy SAU khi form đã hết trạng thái "chưa lưu". Lỗi thì ném để form gắn vào ô.
   */
  onSave: (values: HotelFormOutput) => Promise<{ values: HotelFormInput; afterSave?: () => void }>
  /** Khối trạng thái ở trang sửa (đổi có hiệu lực ngay, không đi cùng nút Lưu). */
  statusControl?: ReactNode
  readOnly?: boolean
  /** Phần chỉ đọc (điểm và số đánh giá). */
  summary?: ReactNode
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent>
        <FieldGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          {children}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function HotelForm({ mode, initialValues, onSave, statusControl, readOnly = false, summary }: HotelFormProps) {
  const destinations = useQuery(getListAdminDestinationsQueryOptions())
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<HotelFormInput, unknown, HotelFormOutput>({
    resolver: zodResolver(hotelFormSchema), defaultValues: initialValues,
  })
  const {
    register, handleSubmit, setValue, setError, reset, control, formState: { errors, isSubmitting, isDirty },
  } = form
  const [slug, description, imageUrl, imageAlt] =
    useWatch({ control, name: ['slug', 'description', 'imageUrl', 'imageAlt'] })

  // Khách sạn mới: slug đi theo tên cho tới khi người dùng tự sửa slug.
  const [slugFollowsName, setSlugFollowsName] = useState(mode === 'create')
  const unsaved = useRef(false)
  useEffect(() => { unsaved.current = isDirty }, [isDirty])
  const hasUnsavedChanges = useCallback(() => unsaved.current, [])

  const submit = (event: FormEvent<HTMLFormElement>) => void handleSubmit(async (values) => {
    setFormError(null)
    try {
      const saved = await onSave(values)
      // Hạ cờ "chưa lưu" ngay, trước khi `afterSave` chuyển trang (effect chỉ chạy sau lần render kế tiếp).
      unsaved.current = false
      reset(saved.values)
      saved.afterSave?.()
    } catch (error) {
      setFormError(applyApiErrors<HotelFormInput>(error, hotelFormFields(values.images.length), setError))
    }
  })(event)

  const nameField = register('name', {
    onChange: (event) => {
      if (slugFollowsName) {
        setValue('slug', slugify(event.target.value, HOTEL_SLUG_MAX_LENGTH), { shouldDirty: true })
      }
    },
  })
  const slugField = register('slug', { onChange: () => setSlugFollowsName(false) })

  const textInput = (name: 'area' | 'imageAlt', label: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`hotel-${name}`}>{label}</FieldLabel>
      <Input id={`hotel-${name}`} aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <FieldError>{errors[name].message}</FieldError>}
    </Field>
  )

  const timeInput = (name: 'checkInTime' | 'checkOutTime', label: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`hotel-${name}`}>{label}</FieldLabel>
      <Input id={`hotel-${name}`} type="time" aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <FieldError>{errors[name].message}</FieldError>}
    </Field>
  )

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={submit} aria-label="Thông tin khách sạn">
        <UnsavedChangesGuard isDirty={hasUnsavedChanges} />
        {/* Không khoá cả form lúc đang gửi: ô lỗi mà API trả về phải focus được ngay (ô đang disabled thì không). */}
        <fieldset disabled={readOnly} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

          <FormSection title="Cơ bản">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="hotel-name">Tên khách sạn</FieldLabel>
              <Input id="hotel-name" aria-invalid={!!errors.name} {...nameField} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.slug}>
              <FieldLabel htmlFor="hotel-slug">Slug</FieldLabel>
              <Input id="hotel-slug" spellCheck={false} aria-invalid={!!errors.slug} {...slugField} />
              <FieldDescription>Phần cuối của địa chỉ trang khách sạn trên website.</FieldDescription>
              {mode === 'edit' && slug !== initialValues.slug && (
                <p role="status" className="text-sm text-warning">
                  Đổi slug sẽ làm hỏng các liên kết cũ tới khách sạn này.
                </p>
              )}
              {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.destinationId}>
              <FieldLabel htmlFor="hotel-destination">Điểm đến</FieldLabel>
              <Controller control={control} name="destinationId" render={({ field }) => (
                <DestinationCombobox id="hotel-destination" ref={field.ref} destinations={destinations.data}
                  value={field.value} onValueChange={field.onChange} onBlur={field.onBlur}
                  aria-invalid={!!errors.destinationId} />
              )} />
              {destinations.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Không tải được danh sách điểm đến.{' '}
                  <button type="button" className="underline" onClick={() => void destinations.refetch()}>Thử lại</button>
                </p>
              )}
              {destinations.data?.length === 0 && (
                <FieldDescription>Chưa có điểm đến nào. <Link to="/destinations">Thêm điểm đến</Link> trước.</FieldDescription>
              )}
              {errors.destinationId && <FieldError>{errors.destinationId.message}</FieldError>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.starRating}>
                <FieldLabel htmlFor="hotel-stars">Hạng sao</FieldLabel>
                <Controller control={control} name="starRating" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hotel-stars" ref={field.ref} onBlur={field.onBlur}
                      aria-invalid={!!errors.starRating}>
                      <SelectValue placeholder="Chọn hạng sao" />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5'].map((stars) => (
                        <SelectItem key={stars} value={stars}>{stars} sao</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.starRating && <FieldError>{errors.starRating.message}</FieldError>}
              </Field>
              {textInput('area', 'Khu vực')}
            </div>
          </FormSection>

          <FormSection title="Mô tả">
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="hotel-description">Giới thiệu</FieldLabel>
              <Textarea id="hotel-description" rows={6} aria-invalid={!!errors.description}
                aria-describedby="hotel-description-count" {...register('description')} />
              <FieldDescription>Website hiện giới thiệu thành một đoạn, không giữ xuống dòng.</FieldDescription>
              <p id="hotel-description-count" className="text-right text-xs text-muted-foreground tabular-nums">
                {description.length}/{HOTEL_DESCRIPTION_MAX_LENGTH} ký tự
              </p>
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>
          </FormSection>

          <FormSection title="Tiện ích">
            <Field data-invalid={!!errors.amenityCodes}>
              <Controller control={control} name="amenityCodes" render={({ field }) => (
                <AmenityPicker scope="HOTEL" legend="Tiện ích của khách sạn" idPrefix="hotel-amenity"
                  value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
                  invalid={!!errors.amenityCodes} />
              )} />
              {errors.amenityCodes && <FieldError>{errors.amenityCodes.message}</FieldError>}
            </Field>
          </FormSection>

          <FormSection title="Giờ nhận/trả phòng">
            <div className="grid gap-4 sm:grid-cols-2">
              {timeInput('checkInTime', 'Giờ nhận phòng')}
              {timeInput('checkOutTime', 'Giờ trả phòng')}
            </div>
          </FormSection>

          <FormSection title="Ảnh">
            <Field data-invalid={!!errors.imageUrl}>
              <FieldLabel htmlFor="hotel-image">Địa chỉ ảnh đại diện</FieldLabel>
              <Input id="hotel-image" type="url" spellCheck={false} aria-invalid={!!errors.imageUrl}
                {...register('imageUrl')} />
              <FieldDescription>Ảnh trên thẻ, kết quả tìm và đơn đặt phòng.</FieldDescription>
              {errors.imageUrl && <FieldError>{errors.imageUrl.message}</FieldError>}
            </Field>
            {textInput('imageAlt', 'Mô tả ảnh đại diện')}
            <ImagePreview url={imageUrl} alt={imageAlt} />
            <h3 className="pt-2 font-medium">Ảnh xem thêm</h3>
            <FieldDescription>
              Hiện ở trang chi tiết sau ảnh đại diện, theo đúng thứ tự dưới đây. Không lặp lại ảnh đại diện.
            </FieldDescription>
            <ImageListField idPrefix="hotel-gallery" />
          </FormSection>

          <FormSection title="Hiển thị"
            description="Khách sạn chỉ hiện trên website khi đang hiện và có ít nhất một loại phòng.">
            {mode === 'create' ? (
              <Field>
                <FieldLabel htmlFor="hotel-status">Trạng thái</FieldLabel>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="hotel-status" ref={field.ref}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Đang hiện (lên website khi có loại phòng)</SelectItem>
                      <SelectItem value="HIDDEN">Đang ẩn</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </Field>
            ) : statusControl}
          </FormSection>

          {summary}
        </fieldset>

        {!readOnly && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex justify-end gap-2 border-t bg-background p-4 md:-mx-6 md:px-6">
            <Button type="button" variant="outline" disabled={!isDirty || isSubmitting}
              onClick={() => { reset(); setFormError(null); setSlugFollowsName(mode === 'create') }}>
              Bỏ thay đổi
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {mode === 'create' ? 'Tạo khách sạn' : 'Lưu'}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
