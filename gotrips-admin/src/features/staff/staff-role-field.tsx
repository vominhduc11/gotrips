import type { Ref } from 'react'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminStaffResponse } from '@/lib/api/generated/model'
import { staffRoleLabels } from './staff-schema'

export function StaffRoleField({ value, onChange, onBlur, fieldRef, error }: {
  value: AdminStaffResponse['role']
  onChange: (role: AdminStaffResponse['role']) => void
  onBlur: () => void
  fieldRef: Ref<HTMLButtonElement>
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="staff-role">Vai trò</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger ref={fieldRef} id="staff-role" onBlur={onBlur}
          aria-invalid={!!error} aria-describedby={error ? 'staff-role-error' : undefined}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="STAFF">{staffRoleLabels.STAFF}</SelectItem>
          <SelectItem value="ADMIN">{staffRoleLabels.ADMIN}</SelectItem>
        </SelectContent>
      </Select>
      {error && <FieldError id="staff-role-error">{error}</FieldError>}
    </Field>
  )
}
