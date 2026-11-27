import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateAdminStaffRole } from '@/lib/api/generated/api'
import type { AdminStaffResponse } from '@/lib/api/generated/model'
import { applyApiErrors } from '@/lib/form-errors'
import { ApiError } from '@/lib/api/http'
import { staffRoleSchema, type StaffRoleValues } from './staff-schema'
import { StaffRoleField } from './staff-role-field'

export function StaffRoleDialog({ staff, onClose, onSuccess, onConflict }: {
  staff: AdminStaffResponse
  onClose: () => void
  onSuccess: () => void
  onConflict: () => void
}) {
  const update = useUpdateAdminStaffRole()
  const { control, handleSubmit, setError, formState: { errors, isDirty, isSubmitting } } = useForm({
    resolver: zodResolver(staffRoleSchema),
    defaultValues: { role: staff.role },
  })
  const submit = handleSubmit(async (data) => {
    try {
      await update.mutateAsync({ id: staff.id, data })
      toast.success('Đã đổi vai trò')
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) onConflict()
      const message = applyApiErrors<StaffRoleValues>(error, ['role'], setError)
      if (message) setError('root', { message })
    }
  })
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Đổi vai trò</DialogTitle>
          <DialogDescription>Chọn quyền quản trị mới cho {staff.fullName}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <Controller control={control} name="role" render={({ field, fieldState }) => (
            <StaffRoleField value={field.value} onChange={field.onChange} onBlur={field.onBlur}
              fieldRef={field.ref} error={fieldState.error?.message} />
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Lưu vai trò
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
