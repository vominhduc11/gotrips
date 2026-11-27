import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ImagePreview } from '@/components/common/image-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getListAdminDestinationsQueryKey, useCreateAdminDestination, useUpdateAdminDestination } from '@/lib/api/generated/api'
import type { AdminDestinationResponse } from '@/lib/api/generated/model'
import { applyApiErrors } from '@/lib/form-errors'
import { slugify } from '@/lib/slug'
import {
  DESTINATION_SLUG_MAX_LENGTH, destinationFormFields, destinationFormSchema, type DestinationFormValues,
} from './destination-form-schema'

const empty: DestinationFormValues = { name: '', slug: '', region: '', imageUrl: '', imageAlt: '' }

/** Thêm mới khi không truyền `destination`, ngược lại là sửa. Mỗi lần mở là một lần mount mới. */
export function DestinationDialog({ destination, regions, onClose }: {
  destination?: AdminDestinationResponse
  regions: string[]
  onClose: () => void
}) {
  const client = useQueryClient()
  const regionListId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  // Điểm đến mới: slug đi theo tên cho tới khi người dùng tự sửa slug.
  const [slugFollowsName, setSlugFollowsName] = useState(!destination)
  const { register, handleSubmit, setValue, setError, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(destinationFormSchema),
    defaultValues: destination
      ? { name: destination.name, slug: destination.slug, region: destination.region,
        imageUrl: destination.imageUrl, imageAlt: destination.imageAlt }
      : empty,
  })
  const [slug, imageUrl, imageAlt] = useWatch({ control, name: ['slug', 'imageUrl', 'imageAlt'] })
  const create = useCreateAdminDestination()
  const update = useUpdateAdminDestination()

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      if (destination) await update.mutateAsync({ id: destination.id, data })
      else await create.mutateAsync({ data })
      void client.invalidateQueries({ queryKey: getListAdminDestinationsQueryKey() })
      toast.success(destination ? 'Đã lưu điểm đến' : 'Đã thêm điểm đến')
      onClose()
    } catch (error) {
      setFormError(applyApiErrors<DestinationFormValues>(error, destinationFormFields, setError))
    }
  })

  const nameField = register('name', {
    onChange: (event) => {
      if (slugFollowsName) setValue('slug', slugify(event.target.value, DESTINATION_SLUG_MAX_LENGTH))
    },
  })
  const slugField = register('slug', { onChange: () => setSlugFollowsName(false) })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{destination ? 'Sửa điểm đến' : 'Thêm điểm đến'}</DialogTitle>
          <DialogDescription>Điểm đến hiện trên website và dùng để phân loại tour, khách sạn.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="destination-name">Tên điểm đến</FieldLabel>
              <Input id="destination-name" aria-invalid={!!errors.name} {...nameField} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.slug}>
              <FieldLabel htmlFor="destination-slug">Slug</FieldLabel>
              <Input id="destination-slug" spellCheck={false} aria-invalid={!!errors.slug} {...slugField} />
              {destination && slug !== destination.slug && (
                <p role="status" className="text-sm text-warning">
                  Đổi slug làm hỏng các liên kết cũ tới trang lọc theo điểm đến này.
                </p>
              )}
              {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.region}>
              <FieldLabel htmlFor="destination-region">Vùng</FieldLabel>
              <Input id="destination-region" list={regionListId} autoComplete="off" aria-invalid={!!errors.region}
                {...register('region')} />
              <datalist id={regionListId}>
                {regions.map((region) => <option key={region} value={region} />)}
              </datalist>
              <FieldDescription>Chọn vùng đã có hoặc nhập vùng mới.</FieldDescription>
              {errors.region && <FieldError>{errors.region.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.imageUrl}>
              <FieldLabel htmlFor="destination-image">Địa chỉ ảnh</FieldLabel>
              <Input id="destination-image" type="url" spellCheck={false} aria-invalid={!!errors.imageUrl}
                {...register('imageUrl')} />
              {errors.imageUrl && <FieldError>{errors.imageUrl.message}</FieldError>}
              <ImagePreview url={imageUrl} alt={imageAlt} />
            </Field>
            <Field data-invalid={!!errors.imageAlt}>
              <FieldLabel htmlFor="destination-alt">Mô tả ảnh</FieldLabel>
              <Input id="destination-alt" aria-invalid={!!errors.imageAlt} {...register('imageAlt')} />
              {errors.imageAlt && <FieldError>{errors.imageAlt.message}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {destination ? 'Lưu điểm đến' : 'Thêm điểm đến'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
