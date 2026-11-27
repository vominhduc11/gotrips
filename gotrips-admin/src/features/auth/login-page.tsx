import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLoaderData, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/common/page-header'
import { SERVICE_UNAVAILABLE } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { useAdminLogin } from '@/lib/api/generated/api'
import { ApiError } from '@/lib/api/http'
import { getSafeRedirectPath } from '@/lib/safe-redirect'
import { adminMeOptions } from './session'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập địa chỉ email.')
    .max(254, 'Email không được quá 254 ký tự.'),
  password: z.string().refine((value) => value.trim().length > 0, 'Vui lòng nhập mật khẩu.')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Mật khẩu quá dài.'),
})

export function LoginPage() {
  const { revoked } = useLoaderData<{ revoked: boolean }>()
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = useAdminLogin({ mutation: { meta: { publicLogin: true } } })
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(async (data) => {
    try {
      const user = await login.mutateAsync({ data })
      queryClient.clear()
      queryClient.setQueryData(adminMeOptions().queryKey, user)
      toast.success('Đã đăng nhập')
      await navigate(getSafeRedirectPath(searchParams.get('next')), { replace: true })
    } catch (error) {
      let message = SERVICE_UNAVAILABLE
      if (error instanceof ApiError && error.status === 400) {
        let firstField = true
        let hasUnknownField = false
        for (const fieldError of error.errors ?? []) {
          if (fieldError.field === 'email' || fieldError.field === 'password') {
            setError(fieldError.field, { message: fieldError.message }, { shouldFocus: firstField })
            firstField = false
          } else {
            hasUnknownField = true
          }
        }
        if (!firstField && !hasUnknownField) return
        message = error.detail ?? 'Dữ liệu gửi lên không hợp lệ.'
      } else if (error instanceof ApiError && error.status === 401) {
        message = 'Email hoặc mật khẩu không đúng.'
      } else if (error instanceof ApiError && error.status === 403) {
        message = error.detail ?? 'Không thể đăng nhập. Tải lại trang rồi thử lại.'
      }
      setError('root', { message })
    }
  })

  return (
    <main id="noi-dung-chinh" className="grid min-h-svh place-items-center bg-muted/60 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <PageHeader title="GoTrips Admin" description="Đăng nhập trang quản trị" />
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={submit} className="space-y-5">
            {revoked && !errors.root && (
              <p role="status" className="text-sm text-warning">Tài khoản không còn quyền truy cập.</p>
            )}
            {errors.root && <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>}
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="username" spellCheck={false}
                  aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
                  {...register('email')} />
                {errors.email && <FieldError id="email-error">{errors.email.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <InputGroup>
                  <InputGroupInput id="password" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton type="button" size="icon-xs"
                      aria-controls="password" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {errors.password && <FieldError id="password-error">{errors.password.message}</FieldError>}
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
