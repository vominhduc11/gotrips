import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { UnsavedChangesGuard } from '@/components/common/unsaved-changes-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useChangeAdminPassword } from '@/lib/api/generated/api'
import { applyApiErrors } from '@/lib/form-errors'
import { changePasswordSchema, passwordHelp, type ChangePasswordValues } from './password-schema'

const fields = [
  { name: 'currentPassword', label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Mật khẩu mới', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Nhập lại mật khẩu mới', autoComplete: 'new-password' },
] as const
const defaultValues: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordPage() {
  const change = useChangeAdminPassword({ mutation: { gcTime: 0 } })
  const { register, handleSubmit, setError, reset, formState: { errors, isDirty, isSubmitting } } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues,
  })

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ data: { currentPassword, newPassword } })
      reset()
      toast.success('Đã đổi mật khẩu')
    } catch (error) {
      const message = applyApiErrors<ChangePasswordValues>(error, ['currentPassword', 'newPassword'], setError)
      if (message) setError('root', { message })
    } finally {
      change.reset()
    }
  })

  return (
    <section className="space-y-5">
      <PageHeader title="Đổi mật khẩu" />
      <UnsavedChangesGuard isDirty={() => isDirty} />
      <Card className="max-w-lg">
        <CardContent>
          <form noValidate onSubmit={submit} className="space-y-5">
            {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
            <FieldGroup>
              {fields.map(({ name, label, autoComplete }) => {
                const error = errors[name]
                const description = name === 'newPassword' ? 'password-help' : undefined
                const errorId = error ? `${name}-error` : undefined
                return <Field key={name} data-invalid={!!error}>
                  <FieldLabel htmlFor={name}>{label}</FieldLabel>
                  <Input id={name} type="password" autoComplete={autoComplete} aria-invalid={!!error}
                    aria-describedby={[description, errorId].filter(Boolean).join(' ') || undefined} {...register(name)} />
                  {description && <FieldDescription id={description}>{passwordHelp}</FieldDescription>}
                  {error && <FieldError id={errorId}>{error.message}</FieldError>}
                </Field>
              })}
            </FieldGroup>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card py-3">
              <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
                Bỏ thay đổi
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                Đổi mật khẩu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
