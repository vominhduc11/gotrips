import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { ImagePreview } from '@/components/common/image-preview'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MAX_IMAGES, type ImageValue } from './image-schema'

/**
 * Danh sách ảnh theo địa chỉ, thứ tự trên màn hình là thứ tự hiển thị trên website. Dùng trong form có trường
 * `images` (bọc bằng `FormProvider`). Đổi thứ tự bằng nút Lên/Xuống nên làm được hoàn toàn bằng bàn phím.
 */
export function ImageListField({ idPrefix }: { idPrefix: string }) {
  const { control, register, formState: { errors } } = useFormContext<{ images: ImageValue[] }>()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images' })
  const images = useWatch({ control, name: 'images' })
  const listError = errors.images?.root?.message ?? errors.images?.message
  const addId = `${idPrefix}-add`

  // Sau khi đổi chỗ hoặc xoá, nút vừa bấm đã chuyển vị trí (hoặc mất): đưa focus tới đúng chỗ sau lần render kế tiếp.
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    if (!pendingFocus.current) return
    document.getElementById(pendingFocus.current)?.focus()
    pendingFocus.current = null
  })

  const moveTo = (from: number, to: number, direction: 'up' | 'down') => {
    // Tới đầu hoặc cuối danh sách thì nút cùng chiều bị khoá: focus nút chiều ngược lại.
    const atEdge = direction === 'up' ? to === 0 : to === fields.length - 1
    const target = atEdge ? (direction === 'up' ? 'down' : 'up') : direction
    pendingFocus.current = `${idPrefix}-${to}-${target}`
    move(from, to)
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && <FieldDescription>Chưa có ảnh nào.</FieldDescription>}
      <ol className="space-y-3">
        {fields.map((field, index) => {
          const number = index + 1
          const urlError = errors.images?.[index]?.url
          const altError = errors.images?.[index]?.alt
          return (
            <li key={field.id} aria-label={`Ảnh ${number}`} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Ảnh {number}</span>
                <div className="flex gap-1">
                  <Button id={`${idPrefix}-${index}-up`} type="button" size="icon-sm" variant="outline"
                    aria-label={`Đưa ảnh ${number} lên`} disabled={index === 0}
                    onClick={() => moveTo(index, index - 1, 'up')}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button id={`${idPrefix}-${index}-down`} type="button" size="icon-sm" variant="outline"
                    aria-label={`Đưa ảnh ${number} xuống`} disabled={index === fields.length - 1}
                    onClick={() => moveTo(index, index + 1, 'down')}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="outline" aria-label={`Xoá ảnh ${number}`}
                    onClick={() => { pendingFocus.current = addId; remove(index) }}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="space-y-3">
                  <Field data-invalid={!!urlError}>
                    <FieldLabel htmlFor={`${idPrefix}-${index}-url`}>Địa chỉ ảnh {number}</FieldLabel>
                    <Input id={`${idPrefix}-${index}-url`} type="url" spellCheck={false} aria-invalid={!!urlError}
                      {...register(`images.${index}.url`)} />
                    {urlError && <FieldError>{urlError.message}</FieldError>}
                  </Field>
                  <Field data-invalid={!!altError}>
                    <FieldLabel htmlFor={`${idPrefix}-${index}-alt`}>Mô tả ảnh {number}</FieldLabel>
                    <Input id={`${idPrefix}-${index}-alt`} aria-invalid={!!altError}
                      {...register(`images.${index}.alt`)} />
                    {altError && <FieldError>{altError.message}</FieldError>}
                  </Field>
                </div>
                <ImagePreview url={images?.[index]?.url ?? ''} alt={images?.[index]?.alt ?? ''} />
              </div>
            </li>
          )
        })}
      </ol>
      {listError && <FieldError>{listError}</FieldError>}
      <Button id={addId} type="button" variant="outline" disabled={fields.length >= MAX_IMAGES}
        onClick={() => append({ url: '', alt: '' })}>
        <Plus aria-hidden="true" />Thêm ảnh
      </Button>
    </div>
  )
}
