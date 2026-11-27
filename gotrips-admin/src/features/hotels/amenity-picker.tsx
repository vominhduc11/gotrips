import { useQuery } from '@tanstack/react-query'
import type { Ref } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getListAdminAmenitiesQueryOptions } from '@/lib/api/generated/api'
import { MAX_AMENITIES } from './hotel-form-schema'

/**
 * Chọn nhiều tiện ích từ danh mục chuẩn của API. Chỉ hiện tiện ích gắn được cho `scope` (API kiểm lại); danh mục chưa
 * quản trị được ở trang này.
 */
export function AmenityPicker({ scope, legend, idPrefix, value, onChange, onBlur, ref, invalid }: {
  scope: 'HOTEL' | 'ROOM'
  /** Tên nhóm cho trình đọc màn hình. */
  legend: string
  idPrefix: string
  /** Mã các tiện ích đang chọn. */
  value: string[]
  onChange: (codes: string[]) => void
  onBlur?: () => void
  /** Gắn vào ô đầu tiên để form focus được khi API báo lỗi tiện ích. */
  ref?: Ref<HTMLButtonElement>
  invalid?: boolean
}) {
  const query = useQuery(getListAdminAmenitiesQueryOptions())

  if (query.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Không tải được danh mục tiện ích.{' '}
        <button type="button" className="underline" onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    )
  }
  if (!query.data) {
    return <Skeleton className="h-20 w-full" aria-label="Đang tải tiện ích" />
  }
  const options = query.data.filter((amenity) => amenity.scope === scope || amenity.scope === 'BOTH')
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có tiện ích nào trong danh mục.</p>
  }

  const toggle = (code: string, checked: boolean) => {
    const next = new Set(value)
    if (checked) next.add(code)
    else next.delete(code)
    // Giữ thứ tự danh mục (như API trả về): bỏ chọn rồi chọn lại không làm form bị coi là đã sửa.
    onChange(options.filter((amenity) => next.has(amenity.code)).map((amenity) => amenity.code))
  }

  return (
    <FieldSet>
      <FieldLegend className="sr-only">{legend}</FieldLegend>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((amenity, index) => {
          const id = `${idPrefix}-${amenity.code}`
          return (
            <li key={amenity.code} className="flex items-center gap-2">
              <Checkbox id={id} ref={index === 0 ? ref : undefined} checked={value.includes(amenity.code)}
                onCheckedChange={(checked) => toggle(amenity.code, checked === true)} onBlur={onBlur}
                aria-invalid={invalid} />
              <Label htmlFor={id}>{amenity.name}</Label>
            </li>
          )
        })}
      </ul>
      <FieldDescription aria-live="polite">Đã chọn {value.length}/{MAX_AMENITIES}.</FieldDescription>
    </FieldSet>
  )
}
