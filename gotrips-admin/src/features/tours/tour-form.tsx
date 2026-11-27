import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ImagePreview } from '@/components/common/image-preview'
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getListAdminDestinationsQueryOptions } from '@/lib/api/generated/api'
import { applyApiErrors } from '@/lib/form-errors'
import { slugify } from '@/lib/slug'
import { DestinationCombobox } from './destination-combobox'
import {
  SHORT_DESCRIPTION_MAX_LENGTH, TOUR_SLUG_MAX_LENGTH, tourFormFields, tourFormSchema, type TourFormInput,
  type TourFormOutput,
} from './tour-form-schema'

interface TourFormProps {
  mode: 'create' | 'edit'
  initialValues: TourFormInput
  /**
   * Gọi API. Thành công thì trả giá trị đã được API chuẩn hoá để form lấy làm mốc mới, và một việc làm tiếp (ví dụ
   * chuyển trang) chạy SAU khi form đã hết trạng thái "chưa lưu". Lỗi thì ném để form gắn vào ô.
   */
  onSave: (values: TourFormOutput) => Promise<{ values: TourFormInput; afterSave?: () => void }>
  /** Khối trạng thái ở trang sửa (đổi có hiệu lực ngay, không đi cùng nút Lưu). */
  statusControl?: ReactNode
  readOnly?: boolean
  /** Phần chỉ đọc (điểm và số đánh giá). */
  summary?: ReactNode
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent><FieldGroup>{children}</FieldGroup></CardContent>
    </Card>
  )
}

export function TourForm({ mode, initialValues, onSave, statusControl, readOnly = false, summary }: TourFormProps) {
  const destinations = useQuery(getListAdminDestinationsQueryOptions())
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register, handleSubmit, setValue, setError, reset, control, formState: { errors, isSubmitting, isDirty },
  } = useForm<TourFormInput, unknown, TourFormOutput>({
    resolver: zodResolver(tourFormSchema), defaultValues: initialValues,
  })
  const [slug, shortDescription, imageUrl, imageAlt] =
    useWatch({ control, name: ['slug', 'shortDescription', 'coverImageUrl', 'coverImageAlt'] })

  // Tour mới: slug đi theo tên cho tới khi người dùng tự sửa slug.
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(mode === 'create')
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
      setFormError(applyApiErrors<TourFormInput>(error, tourFormFields, setError))
    }
  })(event)

  const titleField = register('title', {
    onChange: (event) => {
      if (slugFollowsTitle) {
        setValue('slug', slugify(event.target.value, TOUR_SLUG_MAX_LENGTH), { shouldDirty: true })
      }
    },
  })
  const slugField = register('slug', { onChange: () => setSlugFollowsTitle(false) })

  const textInput = (name: 'departureCity' | 'coverImageAlt', label: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`tour-${name}`}>{label}</FieldLabel>
      <Input id={`tour-${name}`} aria-invalid={!!errors[name]} {...register(name)} />
      {errors[name] && <FieldError>{errors[name].message}</FieldError>}
    </Field>
  )

  const numberInput = (name: 'durationDays' | 'durationNights', label: string) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`tour-${name}`}>{label}</FieldLabel>
      <Input id={`tour-${name}`} inputMode="numeric" autoComplete="off" aria-invalid={!!errors[name]}
        {...register(name)} />
      {errors[name] && <FieldError>{errors[name].message}</FieldError>}
    </Field>
  )

  return (
    <form noValidate onSubmit={submit} aria-label="Thông tin tour">
      <UnsavedChangesGuard isDirty={hasUnsavedChanges} />
      {/* Không khoá cả form lúc đang gửi: ô lỗi mà API trả về phải focus được ngay (ô đang disabled thì không). */}
      <fieldset disabled={readOnly} className="space-y-4">
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

        <FormSection title="Cơ bản">
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="tour-title">Tên tour</FieldLabel>
            <Input id="tour-title" aria-invalid={!!errors.title} {...titleField} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor="tour-slug">Slug</FieldLabel>
            <Input id="tour-slug" spellCheck={false} aria-invalid={!!errors.slug} {...slugField} />
            <FieldDescription>Phần cuối của địa chỉ trang tour trên website.</FieldDescription>
            {mode === 'edit' && slug !== initialValues.slug && (
              <p role="status" className="text-sm text-warning">
                Đổi slug sẽ làm hỏng các liên kết cũ tới tour này.
              </p>
            )}
            {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.destinationId}>
            <FieldLabel htmlFor="tour-destination">Điểm đến</FieldLabel>
            <Controller control={control} name="destinationId" render={({ field }) => (
              <DestinationCombobox id="tour-destination" ref={field.ref} destinations={destinations.data}
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
            {numberInput('durationDays', 'Số ngày')}
            {numberInput('durationNights', 'Số đêm')}
          </div>
          {textInput('departureCity', 'Nơi khởi hành')}
        </FormSection>

        <FormSection title="Mô tả">
          <Field data-invalid={!!errors.shortDescription}>
            <FieldLabel htmlFor="tour-description">Giới thiệu ngắn</FieldLabel>
            <Textarea id="tour-description" rows={4} aria-invalid={!!errors.shortDescription}
              aria-describedby="tour-description-count" {...register('shortDescription')} />
            <p id="tour-description-count" className="text-right text-xs text-muted-foreground tabular-nums">
              {shortDescription.length}/{SHORT_DESCRIPTION_MAX_LENGTH} ký tự
            </p>
            {errors.shortDescription && <FieldError>{errors.shortDescription.message}</FieldError>}
          </Field>
        </FormSection>

        <FormSection title="Ảnh">
          <Field data-invalid={!!errors.coverImageUrl}>
            <FieldLabel htmlFor="tour-image">Địa chỉ ảnh bìa</FieldLabel>
            <Input id="tour-image" type="url" spellCheck={false} aria-invalid={!!errors.coverImageUrl}
              {...register('coverImageUrl')} />
            {errors.coverImageUrl && <FieldError>{errors.coverImageUrl.message}</FieldError>}
          </Field>
          {textInput('coverImageAlt', 'Mô tả ảnh')}
          <ImagePreview url={imageUrl} alt={imageAlt} />
        </FormSection>

        <FormSection title="Hiển thị">
          {mode === 'create' ? (
            <Field>
              <FieldLabel htmlFor="tour-status">Trạng thái</FieldLabel>
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tour-status" ref={field.ref}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Đang hiện (có trên website ngay khi tạo)</SelectItem>
                    <SelectItem value="HIDDEN">Đang ẩn</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </Field>
          ) : statusControl}
          <Field orientation="horizontal">
            <Controller control={control} name="featured" render={({ field }) => (
              <Switch id="tour-featured" ref={field.ref} checked={field.value} onCheckedChange={field.onChange}
                onBlur={field.onBlur} disabled={readOnly} />
            )} />
            <FieldLabel htmlFor="tour-featured">Tour nổi bật (hiện ở Trang chủ khi còn chuyến mở bán)</FieldLabel>
          </Field>
        </FormSection>

        {summary}
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex justify-end gap-2 border-t bg-background p-4 md:-mx-6 md:px-6">
          <Button type="button" variant="outline" disabled={!isDirty || isSubmitting}
            onClick={() => { reset(); setFormError(null); setSlugFollowsTitle(mode === 'create') }}>
            Bỏ thay đổi
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {mode === 'create' ? 'Tạo tour' : 'Lưu'}
          </Button>
        </div>
      )}
    </form>
  )
}
