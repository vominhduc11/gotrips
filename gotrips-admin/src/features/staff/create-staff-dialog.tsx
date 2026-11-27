import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { CopyButton } from '@/components/common/copy-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useCreateAdminStaff } from '@/lib/api/generated/api'
import { applyApiErrors } from '@/lib/form-errors'
import { createStaffSchema, generateTemporaryPassword, type CreateStaffValues } from './staff-schema'
import { StaffRoleField } from './staff-role-field'

export function CreateStaffDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [initialPassword] = useState(generateTemporaryPassword)
  const create = useCreateAdminStaff({ mutation: { gcTime: 0 } })
  const {
    control, register, handleSubmit, setValue, setError, reset, formState: { errors, isSubmitting },
  } = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { fullName: '', email: '', password: initialPassword, role: 'STAFF' },
  })
  const password = useWatch({ control, name: 'password' })

  const submit = handleSubmit(async (data) => {
    try {
      await create.mutateAsync({ data })
      reset({ fullName: '', email: '', password: '', role: 'STAFF' })
      toast.success('Đã thêm nhân viên')
      onSuccess()
    } catch (error) {
      const message = applyApiErrors<CreateStaffValues>(error, ['fullName', 'email', 'role', 'password'], setError)
      if (message) setError('root', { message })
    } finally {
      create.reset()
    }
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>Tạo tài khoản truy cập GoTrips Admin.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
          <FieldGroup>
            <Field data-invalid={!!errors.fullName}>
              <FieldLabel htmlFor="staff-name">Họ và tên</FieldLabel>
              <Input id="staff-name" autoComplete="off" aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'staff-name-error' : undefined} {...register('fullName')} />
              {errors.fullName && <FieldError id="staff-name-error">{errors.fullName.message}</FieldError>}
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="staff-email">Email</FieldLabel>
              <Input id="staff-email" type="email" autoComplete="off" spellCheck={false} aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'staff-email-error' : undefined} {...register('email')} />
              {errors.email && <FieldError id="staff-email-error">{errors.email.message}</FieldError>}
            </Field>
            <Controller control={control} name="role" render={({ field, fieldState }) => (
              <StaffRoleField value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                fieldRef={field.ref} error={fieldState.error?.message} />
            )} />
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="staff-password">Mật khẩu tạm</FieldLabel>
              <InputGroup>
                <InputGroupInput id="staff-password" type="password" autoComplete="new-password" spellCheck={false} aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'staff-password-help staff-password-error' : 'staff-password-help'}
                  {...register('password')} />
                <InputGroupAddon align="inline-end">
                  <CopyButton value={password} sensitive label="Sao chép mật khẩu tạm" />
                </InputGroupAddon>
              </InputGroup>
              <div><Button type="button" variant="outline" size="sm"
                onClick={() => setValue('password', generateTemporaryPassword(), { shouldValidate: true })}>Tạo mật khẩu mới</Button></div>
              <FieldDescription id="staff-password-help">
                Sao chép và gửi mật khẩu qua kênh an toàn. Yêu cầu nhân viên đổi mật khẩu ngay sau khi đăng nhập.
              </FieldDescription>
              {errors.password && <FieldError id="staff-password-error">{errors.password.message}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Thêm nhân viên
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
